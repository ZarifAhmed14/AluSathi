"""Authenticated marketplace API. Browser drafts stay local; shared records use Supabase RLS."""
from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ml.auth import KEY, ORIGINS, URL, call, guard

router = APIRouter(prefix="/marketplace")

ALLOWED_COSTS = {"transport", "loadingSacks", "taxes", "marketFees", "other"}
ALLOWED_OFFER_FIELDS = {"quantity_kg", "price_kg", "pickup_date", "pickup_responsibility", "payment_timing", "payment_method", "expires_at", "terms", "buyer_costs"}


def api(path: str, *, token: str | None = None, method: str = "GET", body: Any = None, prefer: str = "return=representation") -> Any:
    if not URL or not KEY:
        raise HTTPException(503, "Marketplace service is not configured")
    headers = {"apikey": KEY, "Accept": "application/json", "Prefer": prefer}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f"{URL}/rest/v1/{path}", data=data, headers={**headers, **({"Content-Type": "application/json"} if data else {})}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        if error.code in {401, 403, 404}:
            raise HTTPException(404, "Record not found") from None
        if error.code == 409:
            raise HTTPException(409, "This record changed. Refresh and try again.") from None
        raise HTTPException(503, "Marketplace service unavailable") from None
    except (OSError, ValueError):
        raise HTTPException(503, "Marketplace service unavailable") from None


async def current_user(request: Request) -> tuple[dict[str, Any], str]:
    refresh = request.cookies.get("alusathi_refresh")
    if not refresh:
        raise HTTPException(401, "Sign in to continue")
    session = await asyncio.to_thread(call, "token?grant_type=refresh_token", {"refresh_token": refresh})
    user, token = session.get("user"), session.get("access_token")
    if not isinstance(user, dict) or not isinstance(token, str):
        raise HTTPException(401, "Sign in to continue")
    return user, token


def text(value: Any, limit: int, field: str) -> str:
    if not isinstance(value, str):
        raise HTTPException(400, f"Invalid {field}")
    result = value.strip()
    if not result or len(result) > limit:
        raise HTTPException(400, f"Invalid {field}")
    return result


def number(value: Any, low: float, high: float, field: str) -> float:
    if isinstance(value, bool):
        raise HTTPException(400, f"Invalid {field}")
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise HTTPException(400, f"Invalid {field}") from None
    if not low <= parsed <= high:
        raise HTTPException(400, f"Invalid {field}")
    return parsed


def costs(value: Any) -> dict[str, float | None]:
    if not isinstance(value, dict) or set(value) - ALLOWED_COSTS:
        raise HTTPException(400, "Invalid buyer costs")
    result: dict[str, float | None] = {}
    for key in ALLOWED_COSTS:
        item = value.get(key)
        result[key] = None if item is None or item == "" else number(item, 0, 10_000_000, key)
    return result


@router.get("/lots")
async def public_lots():
    return await asyncio.to_thread(api, "market_lots?published=eq.true&select=*&order=updated_at.desc")


@router.get("/me")
async def mine(request: Request):
    user, token = await current_user(request)
    return {"user": {"id": user["id"]}, "profile": await asyncio.to_thread(api, f"market_profiles?user_id=eq.{urllib.parse.quote(user['id'])}&select=*", token=token)}


@router.put("/profile")
async def save_profile(request: Request):
    data = await guard(request)
    user, token = await current_user(request)
    payload = {
        "user_id": user["id"], "contact_name": text(data.get("contactName"), 80, "contact name"),
        "mobile": text(data.get("mobile"), 20, "mobile"), "business_name": str(data.get("businessName") or "").strip()[:80] or None,
        "business_type": data.get("businessType") if data.get("businessType") in {"wholesaler", "aratdar", "retailer", "processor", "farmer"} else None,
        "district": str(data.get("district") or "").strip()[:60] or None,
        "destination": str(data.get("destination") or "").strip()[:180] or None,
    }
    return await asyncio.to_thread(api, "market_profiles?on_conflict=user_id", token=token, method="POST", body=payload, prefer="resolution=merge-duplicates,return=representation")


@router.post("/lots")
async def publish_lot(request: Request):
    data = await guard(request)
    user, token = await current_user(request)
    payload = {
        "seller_id": user["id"], "variety": text(data.get("variety"), 80, "variety"), "quantity_kg": number(data.get("quantityKg"), 0.001, 1_000_000, "quantity"),
        "district": text(data.get("district"), 60, "district"), "upazila": str(data.get("upazila") or "").strip()[:60] or None,
        "ready_date": data.get("readyDate"), "purpose": str(data.get("purpose") or "").strip()[:40] or None,
        "notes": str(data.get("notes") or "").strip()[:300] or None, "photos": data.get("photos") if isinstance(data.get("photos"), list) else [],
        "asking_price": number(data["askingPrice"], 0, 100000, "asking price") if data.get("askingPrice") not in (None, "") else None,
        "published": bool(data.get("published")),
    }
    if not isinstance(payload["ready_date"], str) or len(payload["ready_date"]) != 10:
        raise HTTPException(400, "Invalid ready date")
    return await asyncio.to_thread(api, "market_lots", token=token, method="POST", body=payload)


@router.post("/offers")
async def send_offer(request: Request):
    data = await guard(request)
    user, token = await current_user(request)
    if not isinstance(data.get("lotId"), str):
        raise HTTPException(400, "Invalid lot")
    body = {key: data.get(key) for key in ALLOWED_OFFER_FIELDS if key in data}
    body["quantity_kg"] = number(body.get("quantity_kg"), 0.001, 1_000_000, "quantity")
    body["price_kg"] = number(body.get("price_kg"), 0, 100000, "price")
    body["buyer_costs"] = costs(body.get("buyer_costs", {}))
    body["lot_id"] = data["lotId"]
    body["buyer_id"] = user["id"]
    body["idempotency_key"] = text(data.get("idempotencyKey"), 64, "request")
    return await asyncio.to_thread(api, "rpc/market_send_offer", token=token, method="POST", body=body)


@router.post("/offers/{offer_id}/respond")
async def respond_offer(offer_id: str, request: Request):
    data = await guard(request)
    _, token = await current_user(request)
    action = data.get("action")
    if action not in {"accept", "reject", "withdraw", "counter"}:
        raise HTTPException(400, "Invalid response")
    revision = data.get("revision")
    if not isinstance(revision, int) or revision < 1:
        raise HTTPException(400, "Invalid revision")
    return await asyncio.to_thread(api, "rpc/market_respond_offer", token=token, method="POST", body={"p_offer_id": offer_id, "p_action": action, "p_version": revision, "p_terms": data.get("terms") if isinstance(data.get("terms"), dict) else {}})


@router.post("/purchases/{purchase_id}/collection")
async def report_collection(purchase_id: str, request: Request):
    data = await guard(request)
    _, token = await current_user(request)
    version = data.get("version")
    if not isinstance(version, int) or version < 1:
        raise HTTPException(400, "Invalid version")
    return await asyncio.to_thread(api, "rpc/market_report_collection", token=token, method="POST", body={
        "p_purchase_id": purchase_id,
        "p_received_kg": number(data.get("receivedKg"), 0, 1_000_000, "received weight"),
        "p_rejected_kg": number(data.get("rejectedKg", 0), 0, 1_000_000, "rejected weight"),
        "p_note": str(data.get("note") or "").strip()[:180],
        "p_version": version,
    })


@router.post("/collections/{report_id}/confirm")
async def confirm_collection(report_id: str, request: Request):
    await guard(request)
    _, token = await current_user(request)
    return await asyncio.to_thread(api, "rpc/market_confirm_collection", token=token, method="POST", body={"p_report_id": report_id})


@router.post("/purchases/{purchase_id}/payments")
async def report_payment(purchase_id: str, request: Request):
    data = await guard(request)
    _, token = await current_user(request)
    method = data.get("method") if data.get("method") in {"cash", "mfs", "bank"} else ""
    return await asyncio.to_thread(api, "rpc/market_report_payment", token=token, method="POST", body={
        "p_purchase_id": purchase_id,
        "p_amount": number(data.get("amount"), 0.01, 100_000_000, "amount"),
        "p_method": method,
        "p_reference": text(data.get("reference"), 80, "reference"),
    })


@router.post("/payments/{report_id}/confirm")
async def confirm_payment(report_id: str, request: Request):
    await guard(request)
    _, token = await current_user(request)
    return await asyncio.to_thread(api, "rpc/market_confirm_payment", token=token, method="POST", body={"p_report_id": report_id})


@router.post("/purchases/{purchase_id}/differences")
async def record_difference(purchase_id: str, request: Request):
    data = await guard(request)
    _, token = await current_user(request)
    body = {"p_purchase_id": purchase_id, "p_detail": text(data.get("detail"), 300, "difference")}
    if data.get("quantityKg") not in (None, ""):
        body["p_quantity_kg"] = number(data.get("quantityKg"), 0, 1_000_000, "quantity")
    if data.get("amount") not in (None, ""):
        body["p_amount"] = number(data.get("amount"), 0, 100_000_000, "amount")
    return await asyncio.to_thread(api, "rpc/market_record_disagreement", token=token, method="POST", body=body)
