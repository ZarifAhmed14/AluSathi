"""Lightweight same-origin Vercel API for account and marketplace routes."""
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from ml.auth import router as auth_router
from ml.marketplace import router as marketplace_router

app = FastAPI(title="AluSathi API", docs_url=None, redoc_url=None, root_path="/api")
app.include_router(auth_router)
app.include_router(marketplace_router)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.update({
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
    })
    return response


@app.exception_handler(Exception)
async def safe_error(_, __):
    return JSONResponse(status_code=500, content={"detail": "The request could not be completed."})
