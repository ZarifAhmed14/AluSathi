"""Same-origin Supabase auth; persistent credentials stay in HttpOnly cookies."""
import asyncio
import json
import os
import time
import urllib.error
import urllib.request
import urllib.parse
from collections import defaultdict, deque
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/auth")
env = {}
if Path(".env").exists():
    for line in Path(".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            env[key] = value.strip().strip('"')
URL = os.getenv("SUPABASE_URL", env.get("VITE_SUPABASE_URL", ""))
KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", env.get("VITE_SUPABASE_PUBLISHABLE_KEY", ""))
ORIGINS = set(os.getenv("ALUSATHI_ORIGINS", "http://127.0.0.1:4173,http://127.0.0.1:4176,http://localhost:4176,http://127.0.0.1:8080,http://localhost:8080").split(","))
attempts = defaultdict(deque)

def call(path, data=None, token=None, method=None):
    if not URL or not KEY: raise HTTPException(503, "Account service is not configured")
    headers = {"apikey": KEY, "Content-Type": "application/json"}
    if token: headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(URL + "/auth/v1/" + path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response: return json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:
        code = "auth_failed"
        try: code = json.loads(error.read()).get("error_code", code)
        except ValueError: pass
        allowed = {"email_not_confirmed", "over_email_send_rate_limit", "email_address_not_authorized", "weak_password", "user_already_exists"}
        raise HTTPException(429 if error.code == 429 else 400, code if code in allowed else "auth_failed") from None
    except (OSError, ValueError): raise HTTPException(503, "Account service unavailable") from None

async def guard(request):
    if request.headers.get("origin") not in ORIGINS or request.headers.get("x-alusathi-request") != "1": raise HTTPException(403, "Request not allowed")
    if request.headers.get("content-type", "").split(";")[0] != "application/json": raise HTTPException(415, "JSON required")
    body = b""
    async for chunk in request.stream():
        body += chunk
        if len(body) > 4096: raise HTTPException(413, "Request too large")
    ip = request.client.host if request.client else "unknown"
    queue = attempts[ip]; now = time.monotonic()
    while queue and queue[0] < now - 60: queue.popleft()
    if len(queue) >= 30: raise HTTPException(429, "Try again shortly")
    queue.append(now)
    if len(attempts) > 10000:
        for key in list(attempts):
            if not attempts[key] or attempts[key][-1] < now - 60: del attempts[key]
    try:
        data = json.loads(body)
        if not isinstance(data, dict): raise ValueError()
        return data
    except ValueError: raise HTTPException(400, "Invalid request") from None

def session_response(data, request):
    response = JSONResponse({"user": data.get("user"), "access_token": data.get("access_token"), "expires_at": data.get("expires_at", int(time.time()) + data.get("expires_in", 0))})
    if data.get("refresh_token"):
        response.set_cookie("alusathi_refresh", data["refresh_token"], httponly=True, secure=request.headers.get("origin", "").startswith("https://"), samesite="strict", path="/api", max_age=30*86400)
    return response

@router.post("/{action}")
async def auth_action(action: str, request: Request):
    data = await guard(request)
    if action == "session":
        refresh = request.cookies.get("alusathi_refresh")
        if not refresh: return {"user": None, "access_token": None}
        try: return session_response(await asyncio.to_thread(call, "token?grant_type=refresh_token", {"refresh_token": refresh}), request)
        except HTTPException as error:
            if error.status_code >= 500: raise
            response = session_response({}, request); response.delete_cookie("alusathi_refresh", path="/api"); return response
    if action == "signout":
        token = data.get("access_token")
        if isinstance(token, str) and token:
            try: await asyncio.to_thread(call, "logout?scope=local", {}, token)
            except HTTPException: pass
        response = session_response({}, request); response.delete_cookie("alusathi_refresh", path="/api"); return response
    email, password = data.get("email", ""), data.get("password", "")
    if action in {"signin", "signup", "recover"}:
        if not isinstance(email, str) or not 3 <= len(email) <= 254 or "@" not in email: raise HTTPException(400, "Invalid email")
    if action in {"signin", "signup", "password"}:
        if not isinstance(password, str) or not (8 if action != "signin" else 1) <= len(password) <= 128: raise HTTPException(400, "Invalid password length")
    if action == "signin": return session_response(await asyncio.to_thread(call, "token?grant_type=password", {"email": email, "password": password}), request)
    if action == "signup":
        name = data.get("name", "")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80: raise HTTPException(400, "Invalid name")
        await asyncio.to_thread(call, "signup?redirect_to=" + urllib.parse.quote(request.headers["origin"] + "/auth", safe=""), {"email": email, "password": password, "data": {"farmer_name": name.strip()}})
        return {"sent": True}
    if action == "recover":
        await asyncio.to_thread(call, "recover?redirect_to=" + urllib.parse.quote(request.headers["origin"] + "/auth", safe=""), {"email": email}); return {"sent": True}
    if action == "exchange":
        refresh = data.get("refresh_token")
        if not isinstance(refresh, str) or not 1 <= len(refresh) <= 1024: raise HTTPException(400, "Invalid session")
        return session_response(await asyncio.to_thread(call, "token?grant_type=refresh_token", {"refresh_token": refresh}), request)
    if action == "password":
        token = data.get("access_token")
        if not isinstance(token, str) or not token: raise HTTPException(401, "Sign in first")
        await asyncio.to_thread(call, "user", {"password": password}, token, "PUT"); return {"updated": True}
    raise HTTPException(404, "Unknown action")
