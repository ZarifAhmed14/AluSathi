"""Authenticated marketplace API. Browser drafts stay local; shared records use Supabase RLS."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import io
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from PIL import Image, UnidentifiedImageError

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
        if error.code in {401, 403}:
            raise HTTPException(404, "Record not found") from None
        if error.code == 404:
            raise HTTPException(503, "Marketplace schema is not available") from None
        if error.code == 409:
            raise HTTPException(409, "This record changed. Refresh and try again.") from None
        raise HTTPException(503, "Marketplace service unavailable") from None
    except (OSError, ValueError):
        raise HTTPException(503, "Marketplace service unavailable") from None


async def current_user(request: Request, response: Response) -> tuple[dict[str, Any], str]:
    refresh = request.cookies.get("alusathi_refresh")
    if not refresh:
        raise HTTPException(401, "Sign in to continue")
    session = await asyncio.to_thread(call, "token?grant_type=refresh_token", {"refresh_token": refresh})
    user, token = session.get("user"), session.get("access_token")
    if not isinstance(user, dict) or not isinstance(token, str):
        raise HTTPException(401, "Sign in to continue")
    rotated = session.get("refresh_token")
    if isinstance(rotated, str) and rotated:
        response.set_cookie("alusathi_refresh", rotated, httponly=True, secure=request.headers.get("origin", "").startswith("https://"), samesite="strict", path="/api", max_age=30 * 86400)
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
    lots = await asyncio.to_thread(api, "market_lots?published=eq.true&select=id,seller_id,variety,quantity_kg,reserved_kg,district,upazila,ready_date,harvest_date,purpose,notes,size_description,condition_description,storage_description,photos,asking_price,asking_price_min,asking_price_max,version,updated_at&order=updated_at.desc")
    if lots:
        ids = [row.get("id") for row in lots if isinstance(row, dict)]
        try:
            sellers = await asyncio.to_thread(api, "rpc/market_catalogue_seller_info", method="POST", body={"p_lot_ids": ids})
        except HTTPException:
            sellers = []
        profiles = {row.get("lot_id"): row for row in sellers if isinstance(row, dict)}
        for lot in lots:
            profile = profiles.get(lot.get("id"), {})
            lot["farmer_name"] = profile.get("name")
            lot["farmer_business_name"] = profile.get("business_name")
            lot["contact_phone"] = profile.get("mobile")
    return [_public_lot_photos(lot) for lot in lots]


def _public_lot_photos(lot: dict[str, Any]) -> dict[str, Any]:
    public_base = f"{URL.rstrip('/')}/storage/v1/object/public/market-lot-photos/"
    photos = lot.get("photos") if isinstance(lot.get("photos"), list) else []
    lot["photos"] = [
        {**photo, "src": public_base + photo["src"]}
        for photo in photos
        if isinstance(photo, dict) and isinstance(photo.get("src"), str)
        and re.fullmatch(r"[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg", photo["src"])
    ]
    return lot


def _store_lot_photo(path: str, content: bytes, token: str) -> None:
    request = urllib.request.Request(
        f"{URL}/storage/v1/object/market-lot-photos/{urllib.parse.quote(path, safe='/')}",
        data=content,
        headers={"apikey": KEY, "Authorization": f"Bearer {token}", "Content-Type": "image/jpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20):
            return
    except urllib.error.HTTPError:
        raise HTTPException(503, "Lot photo could not be shared") from None
    except OSError:
        raise HTTPException(503, "Lot photo could not be shared") from None


@router.get("/me")
async def mine(request: Request, response: Response):
    user, token = await current_user(request, response)
    uid = urllib.parse.quote(user["id"])
    tables = {
        "profile": f"market_profiles?user_id=eq.{uid}&select=user_id,contact_name,mobile,business_name,business_type,district,destination,share_contact",
        "lots": f"market_lots?seller_id=eq.{uid}&select=*&order=updated_at.desc",
        "offers": f"market_offers?or=(buyer_id.eq.{uid},seller_id.eq.{uid})&select=*&order=updated_at.desc",
        "requests": f"market_buying_requests?buyer_id=eq.{uid}&select=*&order=updated_at.desc",
        "purchases": f"market_purchases?or=(buyer_id.eq.{uid},seller_id.eq.{uid})&select=*&order=updated_at.desc",
    }
    async def read(path: str):
        return await asyncio.to_thread(api, path, token=token)
    values = await asyncio.gather(*(read(path) for path in tables.values()))
    result = dict(zip(tables, values))
    result["lots"] = [_public_lot_photos(lot) for lot in result["lots"]]
    purchase_ids = [row["id"] for row in result["purchases"] if isinstance(row, dict) and row.get("id")]
    if purchase_ids:
        ids = "(" + ",".join(urllib.parse.quote(item) for item in purchase_ids) + ")"
        children = {
            "pickups": f"market_pickups?purchase_id=in.{ids}&select=*&order=created_at.desc",
            "payments": f"market_payment_reports?purchase_id=in.{ids}&select=*&order=created_at.desc",
            "expenses": f"market_expenses?purchase_id=in.{ids}&select=*&order=created_at.desc",
            "history": f"market_history?purchase_id=in.{ids}&select=*&order=created_at.desc",
            "actions": f"market_purchase_actions?purchase_id=in.{ids}&select=*&order=created_at.desc",
        }
        child_values = await asyncio.gather(*(read(path) for path in children.values()))
        result.update(dict(zip(children, child_values)))
    else:
        result.update({"pickups": [], "payments": [], "expenses": [], "history": [], "actions": []})
    return {"user": {"id": user["id"]}, **result}


@router.get("/profile")
async def marketplace_profile(request: Request, response: Response):
    user, token = await current_user(request, response)
    rows = await asyncio.to_thread(api, f"market_profiles?user_id=eq.{urllib.parse.quote(user['id'])}&select=user_id,contact_name,mobile,business_name,business_type,district,destination,share_contact", token=token)
    profile = rows[0] if rows else {}
    metadata = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}
    return {"user": {"id": user["id"]}, "profile": profile, "name": profile.get("contact_name") or metadata.get("farmer_name") or ""}


@router.get("/catalogue-requests")
async def catalogue_requests(request: Request, response: Response):
    _, token = await current_user(request, response)
    rows = await asyncio.to_thread(api, "rpc/market_catalogue_request_feed", token=token, method="POST", body={})
    for row in rows if isinstance(rows, list) else []:
        if isinstance(row, dict) and isinstance(row.get("lot"), dict):
            row["lot"] = _public_lot_photos(row["lot"])
    return rows


@router.post("/catalogue-requests")
async def create_catalogue_request(request: Request, response: Response):
    from uuid import UUID
    data = await guard(request)
    _, token = await current_user(request, response)
    try:
        lot_id = str(UUID(text(data.get("lotId"), 36, "lot")))
        request_id = str(UUID(text(data.get("requestId"), 36, "request id")))
        quantity = Decimal(str(data.get("quantityKg")))
        total = Decimal(str(data.get("totalOffer")))
        if not quantity.is_finite() or not total.is_finite() or quantity <= 0 or quantity > Decimal("1000000") or total < 0 or total > Decimal("999999999999.99"):
            raise InvalidOperation
        if quantity.as_tuple().exponent < -3 or total.as_tuple().exponent < -2:
            raise InvalidOperation
    except (ValueError, InvalidOperation, TypeError):
        raise HTTPException(400, "Enter a valid quantity and total offer") from None
    return await asyncio.to_thread(api, "rpc/market_send_catalogue_request", token=token, method="POST", body={"p_lot_id": lot_id, "p_quantity_kg": str(quantity), "p_total": str(total), "p_idempotency_key": request_id})


@router.post("/catalogue-requests/{offer_id}/respond")
async def respond_catalogue_request(offer_id: str, request: Request, response: Response):
    from uuid import UUID
    data = await guard(request)
    _, token = await current_user(request, response)
    try:
        parsed_id = str(UUID(offer_id))
    except ValueError:
        raise HTTPException(400, "Invalid request") from None
    action = data.get("action")
    revision = data.get("revision")
    if action not in {"accept", "decline", "withdraw", "resend", "cancel"} or not isinstance(revision, int) or revision < 1:
        raise HTTPException(400, "Invalid response")
    total = None
    if action == "resend":
        try:
            total = Decimal(str(data.get("totalOffer")))
            if not total.is_finite() or total < 0 or total > Decimal("999999999999.99") or total.as_tuple().exponent < -2:
                raise InvalidOperation
        except (ValueError, InvalidOperation, TypeError):
            raise HTTPException(400, "Enter a valid total offer") from None
    return await asyncio.to_thread(api, "rpc/market_respond_catalogue_request", token=token, method="POST", body={"p_offer_id": parsed_id, "p_action": action, "p_revision": revision, "p_total": str(total) if total is not None else None})


@router.post("/catalogue-requests/{offer_id}/read")
async def acknowledge_catalogue_request(offer_id: str, request: Request, response: Response):
    from uuid import UUID
    data = await guard(request)
    _, token = await current_user(request, response)
    try:
        parsed_id = str(UUID(offer_id))
    except ValueError:
        raise HTTPException(400, "Invalid request") from None
    revision = data.get("revision")
    if not isinstance(revision, int) or revision < 1:
        raise HTTPException(400, "Invalid revision")
    return await asyncio.to_thread(api, "rpc/market_ack_catalogue_request", token=token, method="POST", body={"p_offer_id": parsed_id, "p_revision": revision})


@router.get("/requests")
async def buying_requests(request: Request, response: Response):
    _, token = await current_user(request, response)
    return await asyncio.to_thread(api, "market_buying_requests?status=eq.open&select=id,variety,quantity_kg,reserved_kg,fulfilled_kg,target_price,price_unit,price_unit_kg,district,destination,needed_date,notes,status,created_at&order=created_at.desc", token=token)


@router.post("/requests")
async def create_buying_request(request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    payload = data.get("request")
    if not isinstance(payload, dict):
        raise HTTPException(400, "Invalid buying request")
    normalized = {
        "variety": str(payload.get("variety") or "").strip()[:80],
        "quantity_kg": number(payload.get("quantityKg"), 0.001, 1_000_000, "quantity"),
        "target_price": number(payload.get("targetPrice"), 0, 100_000_000, "target price"),
        "price_unit": payload.get("priceUnit") if payload.get("priceUnit") in {"kg", "mon", "bag"} else "kg",
        "price_unit_kg": number(payload.get("priceUnitKg", 1), 0.001, 100_000, "price unit conversion"),
        "district": text(payload.get("district"), 60, "district"),
        "destination": text(payload.get("destination"), 180, "destination"),
        "needed_date": text(payload.get("neededDate"), 10, "needed date"),
        "notes": str(payload.get("notes") or "").strip()[:500],
    }
    try:
        import uuid
        request_id = str(uuid.UUID(text(data.get("requestId"), 36, "request id")))
    except ValueError:
        raise HTTPException(400, "Invalid request id") from None
    return await asyncio.to_thread(api, "rpc/market_create_request", token=token, method="POST", body={"p_request": normalized, "p_request_id": request_id})


@router.put("/profile")
async def save_profile(request: Request, response: Response):
    data = await guard(request)
    user, token = await current_user(request, response)
    mobile = text(data.get("mobile"), 20, "mobile").replace(" ", "").replace("-", "")
    if not __import__("re").fullmatch(r"(?:\+?88)?01[3-9]\d{8}", mobile):
        raise HTTPException(400, "Enter a valid Bangladesh mobile number")
    payload = {
        "user_id": user["id"], "contact_name": text(data.get("contactName"), 80, "contact name"),
        "mobile": mobile, "business_name": str(data.get("businessName") or "").strip()[:80] or None,
        "business_type": data.get("businessType") if data.get("businessType") in {"wholesaler", "aratdar", "retailer", "processor", "farmer"} else None,
        "district": str(data.get("district") or "").strip()[:60] or None,
        "destination": str(data.get("destination") or "").strip()[:180] or None,
        "share_contact": data.get("shareContact") is True,
    }
    return await asyncio.to_thread(api, "market_profiles?on_conflict=user_id", token=token, method="POST", body=payload, prefer="resolution=merge-duplicates,return=representation")


@router.get("/lots/{lot_id}/contact")
async def lot_contact(lot_id: str, request: Request, response: Response):
    _, token = await current_user(request, response)
    try:
        import uuid
        parsed_id = str(uuid.UUID(lot_id))
    except ValueError:
        raise HTTPException(400, "Invalid lot") from None
    return await asyncio.to_thread(api, "rpc/market_farmer_contact", token=token, method="POST", body={"p_lot_id": parsed_id})


@router.post("/lots")
async def publish_lot(request: Request, response: Response):
    data = await guard(request, max_bytes=2_500_000)
    user, token = await current_user(request, response)
    try:
        import uuid
        lot_id = str(uuid.UUID(text(data.get("id"), 36, "lot id")))
    except ValueError:
        raise HTTPException(400, "Invalid lot id") from None
    payload = {
        "id": lot_id, "seller_id": user["id"], "variety": text(data.get("variety"), 80, "variety"), "quantity_kg": number(data.get("quantityKg"), 0.001, 1_000_000, "quantity"),
        "district": text(data.get("district"), 60, "district"), "upazila": str(data.get("upazila") or "").strip()[:60] or None,
        "ready_date": data.get("readyDate"), "purpose": str(data.get("purpose") or "").strip()[:40] or None,
        "harvest_date": data.get("harvestDate") or None,
        "notes": str(data.get("notes") or "").strip()[:300] or None,
        "size_description": str(data.get("sizeDescription") or "").strip()[:120] or None,
        "condition_description": str(data.get("conditionDescription") or data.get("notes") or "").strip()[:200] or None,
        "storage_description": str(data.get("storageDescription") or "").strip()[:200] or None, "photos": [],
        "asking_price": number(data["askingPrice"], 0, 100000, "asking price") if data.get("askingPrice") not in (None, "") else None,
        "asking_price_min": number(data["askingPriceMin"], 0, 100000, "minimum asking price") if data.get("askingPriceMin") not in (None, "") else None,
        "asking_price_max": number(data["askingPriceMax"], 0, 100000, "maximum asking price") if data.get("askingPriceMax") not in (None, "") else None,
        "published": bool(data.get("published")),
    }
    if (payload["asking_price_min"] is None) != (payload["asking_price_max"] is None) or (payload["asking_price_min"] is not None and payload["asking_price_max"] < payload["asking_price_min"]):
        raise HTTPException(400, "Enter both prices and ensure the maximum is not below the minimum")
    if not isinstance(payload["ready_date"], str) or len(payload["ready_date"]) != 10:
        raise HTTPException(400, "Invalid ready date")
    photos = data.get("photos", [])
    if not isinstance(photos, list) or not 1 <= len(photos) <= 3:
        raise HTTPException(400, "Add one to three potato photos")
    if payload["asking_price_min"] is None:
        raise HTTPException(400, "Set an asking price before publishing")
    for photo in photos:
        if not isinstance(photo, dict) or not isinstance(photo.get("src"), str):
            raise HTTPException(400, "Invalid potato photo")
        encoded = photo["src"]
        if not encoded.startswith("data:image/jpeg;base64,"):
            raise HTTPException(400, "Potato photos must be JPEG images")
        try:
            raw = base64.b64decode(encoded.split(",", 1)[1], validate=True)
            if not raw or len(raw) > 550_000 or not raw.startswith(b"\xff\xd8\xff"):
                raise ValueError
            image = Image.open(io.BytesIO(raw))
            if image.format != "JPEG" or image.width * image.height > 16_000_000:
                raise ValueError
            image.load()
            image.thumbnail((900, 900))
            clean = io.BytesIO()
            image.convert("RGB").save(clean, format="JPEG", quality=76, optimize=True)
            content = clean.getvalue()
            if len(content) > 550_000:
                raise ValueError
        except (ValueError, UnidentifiedImageError, OSError):
            raise HTTPException(400, "One potato photo is invalid or too large") from None
        import uuid
        path = f"{user['id']}/{lot_id}/{uuid.uuid4()}.jpg"
        await asyncio.to_thread(_store_lot_photo, path, content, token)
        payload["photos"].append({
            "src": path,
            "takenOn": str(photo.get("takenOn") or "")[:10],
            "addedAt": str(photo.get("addedAt") or "")[:40],
        })
    return await asyncio.to_thread(api, "market_lots?on_conflict=id", token=token, method="POST", body=payload, prefer="resolution=merge-duplicates,return=representation")
@router.post("/offers")
async def send_offer(request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    lot_id = data.get("lotId")
    if not isinstance(lot_id, str):
        raise HTTPException(400, "Invalid lot")
    terms = data.get("terms")
    if not isinstance(terms, dict):
        raise HTTPException(400, "Invalid terms")
    normalized = {
        "quantity_kg": number(terms.get("quantity_kg"), 0.001, 1_000_000, "quantity"),
        "price": number(terms.get("price"), 0, 100_000_000, "price"),
        "price_unit": terms.get("price_unit") if terms.get("price_unit") in {"kg", "mon", "bag"} else "kg",
        "price_unit_kg": number(terms.get("price_unit_kg", 1), 0.001, 100_000, "price unit conversion"),
        "pickup_date": terms.get("pickup_date") or None,
        "pickup_responsibility": terms.get("pickup_responsibility") if terms.get("pickup_responsibility") in {"buyer", "farmer"} else "buyer",
        "payment_timing": text(terms.get("payment_timing", "on_collection"), 40, "payment timing"),
        "payment_method": terms.get("payment_method") if terms.get("payment_method") in {"cash", "mfs", "bank"} else "cash",
        "destination": str(terms.get("destination") or "").strip()[:180],
        "notes": str(terms.get("notes") or "").strip()[:500],
        "buyer_costs": costs(terms.get("buyer_costs", {})),
    }
    key = text(data.get("idempotencyKey"), 64, "request")
    try:
        import uuid
        parsed_key = str(uuid.UUID(key))
    except ValueError:
        raise HTTPException(400, "Invalid request id") from None
    request_id = data.get("buyingRequestId")
    if request_id is not None and not isinstance(request_id, str):
        raise HTTPException(400, "Invalid buying request")
    return await asyncio.to_thread(api, "rpc/market_send_offer_v2", token=token, method="POST", body={"p_lot_id": lot_id, "p_terms": normalized, "p_idempotency_key": parsed_key, "p_request_id": request_id})


@router.post("/requests/{request_id}/offers")
async def propose_to_request(request_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    lot_id, terms, key = data.get("lotId"), data.get("terms"), data.get("idempotencyKey")
    if not isinstance(lot_id, str) or not isinstance(terms, dict):
        raise HTTPException(400, "Invalid proposal")
    normalized = {
        "quantity_kg": number(terms.get("quantity_kg"), 0.001, 1_000_000, "quantity"),
        "price": number(terms.get("price"), 0, 100_000_000, "price"),
        "price_unit": terms.get("price_unit") if terms.get("price_unit") in {"kg", "mon", "bag"} else "kg",
        "price_unit_kg": number(terms.get("price_unit_kg", 1), 0.001, 100_000, "price unit conversion"),
        "pickup_date": terms.get("pickup_date") or None,
        "pickup_responsibility": terms.get("pickup_responsibility") if terms.get("pickup_responsibility") in {"buyer", "farmer"} else "farmer",
        "payment_timing": text(terms.get("payment_timing", "on_collection"), 40, "payment timing"),
        "payment_method": terms.get("payment_method") if terms.get("payment_method") in {"cash", "mfs", "bank"} else "cash",
        "destination": str(terms.get("destination") or "").strip()[:180],
        "notes": str(terms.get("notes") or "").strip()[:500],
    }
    try:
        import uuid
        request_key = str(uuid.UUID(text(key, 64, "request id")))
    except ValueError:
        raise HTTPException(400, "Invalid request id") from None
    return await asyncio.to_thread(api, "rpc/market_propose_request", token=token, method="POST", body={"p_request_id": request_id, "p_lot_id": lot_id, "p_terms": normalized, "p_idempotency_key": request_key})


@router.post("/offers/{offer_id}/respond")
async def respond_offer(offer_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    action = "decline" if data.get("action") == "reject" else data.get("action")
    if action not in {"accept", "decline", "withdraw", "counter"}:
        raise HTTPException(400, "Invalid response")
    revision = data.get("revision")
    if not isinstance(revision, int) or revision < 1:
        raise HTTPException(400, "Invalid revision")
    terms = data.get("terms") if isinstance(data.get("terms"), dict) else {}
    if action == "counter":
        terms = {
            "quantity_kg": number(terms.get("quantity_kg"), 0.001, 1_000_000, "quantity"),
            "price": number(terms.get("price"), 0, 100_000_000, "price"),
            "price_unit": terms.get("price_unit") if terms.get("price_unit") in {"kg", "mon", "bag"} else "kg",
            "price_unit_kg": number(terms.get("price_unit_kg", 1), 0.001, 100_000, "price unit conversion"),
            "pickup_date": terms.get("pickup_date") or None,
            "pickup_responsibility": terms.get("pickup_responsibility") if terms.get("pickup_responsibility") in {"buyer", "farmer"} else "buyer",
            "payment_timing": text(terms.get("payment_timing", "on_collection"), 40, "payment timing"),
            "payment_method": terms.get("payment_method") if terms.get("payment_method") in {"cash", "mfs", "bank"} else "cash",
            "destination": str(terms.get("destination") or "").strip()[:180], "notes": str(terms.get("notes") or "").strip()[:500],
            "buyer_costs": costs(terms.get("buyer_costs", {})),
        }
    return await asyncio.to_thread(api, "rpc/market_respond_offer_v2", token=token, method="POST", body={"p_offer_id": offer_id, "p_action": action, "p_expected_revision": revision, "p_terms": terms})


@router.get("/offers/{offer_id}/contact")
async def offer_contact(offer_id: str, request: Request, response: Response):
    _, token = await current_user(request, response)
    return await asyncio.to_thread(api, "rpc/market_offer_contact", token=token, method="POST", body={"p_offer_id": offer_id})


@router.post("/purchases/{purchase_id}/collection")
async def report_collection(purchase_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    pickup = data.get("pickup")
    if not isinstance(pickup, dict):
        raise HTTPException(400, "Invalid pickup")
    pickup = {
        "pickup_date": text(pickup.get("pickupDate"), 10, "pickup date"),
        "gross_kg": number(pickup.get("grossKg"), 0.001, 1_000_000, "gross weight"),
        "tare_kg": number(pickup.get("tareKg", 0), 0, 1_000_000, "tare weight"),
        "deduction_type": pickup.get("deductionType") if pickup.get("deductionType") in {"kg", "percent"} else "kg",
        "deduction_value": number(pickup.get("deductionValue", 0), 0, 100_000_000, "deduction"),
        "zero_weight_reason": str(pickup.get("zeroWeightReason") or "").strip()[:200],
        "note": str(pickup.get("note") or "").strip()[:500],
    }
    if pickup["deduction_type"] == "percent" and pickup["deduction_value"] > 100:
        raise HTTPException(400, "Deduction percent cannot exceed 100")
    try:
        import uuid
        key = str(uuid.UUID(text(data.get("idempotencyKey"), 36, "request id")))
    except ValueError:
        raise HTTPException(400, "Invalid request id") from None
    return await asyncio.to_thread(api, "rpc/market_report_pickup", token=token, method="POST", body={"p_purchase_id": purchase_id, "p_pickup": pickup, "p_idempotency_key": key})


@router.post("/collections/{report_id}/confirm")
async def confirm_collection(report_id: str, request: Request, response: Response):
    await guard(request)
    _, token = await current_user(request, response)
    return await asyncio.to_thread(api, "rpc/market_confirm_pickup", token=token, method="POST", body={"p_pickup_id": report_id})


@router.post("/purchases/{purchase_id}/payments")
async def report_payment(purchase_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    method = data.get("method") if data.get("method") in {"cash", "mfs", "bank"} else ""
    try:
        import uuid
        key = str(uuid.UUID(text(data.get("idempotencyKey"), 36, "request id")))
    except ValueError:
        raise HTTPException(400, "Invalid request id") from None
    payment_date = text(data.get("paymentDate"), 10, "payment date")
    reference = str(data.get("reference") or "").strip()
    if method in {"mfs", "bank"} and not reference:
        raise HTTPException(400, "A transaction reference is required")
    return await asyncio.to_thread(api, "rpc/market_report_payment_v2", token=token, method="POST", body={
        "p_purchase_id": purchase_id, "p_amount": number(data.get("amount"), 0.01, 100_000_000, "amount"),
        "p_method": method, "p_reference": reference, "p_payment_date": payment_date, "p_idempotency_key": key,
    })


@router.post("/payments/{report_id}/confirm")
async def confirm_payment(report_id: str, request: Request, response: Response):
    await guard(request)
    _, token = await current_user(request, response)
    return await asyncio.to_thread(api, "rpc/market_confirm_payment_v2", token=token, method="POST", body={"p_report_id": report_id})


@router.post("/purchases/{purchase_id}/differences")
async def record_difference(purchase_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    body = {"p_purchase_id": purchase_id, "p_detail": text(data.get("detail"), 300, "difference")}
    if data.get("quantityKg") not in (None, ""):
        body["p_quantity_kg"] = number(data.get("quantityKg"), 0, 1_000_000, "quantity")
    if data.get("amount") not in (None, ""):
        body["p_amount"] = number(data.get("amount"), 0, 100_000_000, "amount")
    return await asyncio.to_thread(api, "rpc/market_record_disagreement", token=token, method="POST", body=body)


@router.post("/purchases/{purchase_id}/actions")
async def request_purchase_action(purchase_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    action = data.get("action")
    if action not in {"cancel_purchase", "close_remainder", "correct_pickup", "resolve_disagreement"}:
        raise HTTPException(400, "Invalid action")
    target_id = data.get("targetId")
    if target_id is not None and not isinstance(target_id, str):
        raise HTTPException(400, "Invalid target")
    return await asyncio.to_thread(api, "rpc/market_request_purchase_action", token=token, method="POST", body={
        "p_purchase_id": purchase_id, "p_action": action, "p_payload": data.get("payload") if isinstance(data.get("payload"), dict) else {}, "p_target_id": target_id,
    })


@router.post("/actions/{action_id}/respond")
async def respond_purchase_action(action_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    if not isinstance(data.get("approve"), bool):
        raise HTTPException(400, "Invalid response")
    return await asyncio.to_thread(api, "rpc/market_respond_purchase_action", token=token, method="POST", body={"p_action_id": action_id, "p_approve": data["approve"]})


@router.post("/purchases/{purchase_id}/expenses")
async def add_expense(purchase_id: str, request: Request, response: Response):
    data = await guard(request)
    _, token = await current_user(request, response)
    status = data.get("status") if data.get("status") in {"estimated", "actual", "unknown"} else "actual"
    pickup_id = data.get("pickupId")
    if pickup_id is not None and not isinstance(pickup_id, str):
        raise HTTPException(400, "Invalid pickup")
    amount = None if status == "unknown" else number(data.get("amount"), 0, 100_000_000, "expense")
    return await asyncio.to_thread(api, "rpc/market_add_expense", token=token, method="POST", body={
        "p_purchase_id": purchase_id, "p_pickup_id": pickup_id, "p_label": text(data.get("label"), 80, "expense label"),
        "p_amount": amount, "p_status": status, "p_note": str(data.get("note") or "").strip()[:300],
    })
