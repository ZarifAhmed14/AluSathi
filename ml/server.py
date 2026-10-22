from __future__ import annotations

import asyncio
import io
import json
import os
import time
from collections import defaultdict, deque
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms

from ml.inference_policy import CONFIDENCE_THRESHOLD, MARGIN_THRESHOLD, image_quality, should_reject
from ml.tuber import inspect_tubers
from ml.auth import router as auth_router
from ml.marketplace import router as marketplace_router


MODEL_PATH = Path(os.getenv("ALUSATHI_MODEL", "ml/artifacts/potato_mobilenet_v3.pt"))
MODEL_METADATA_PATH = Path(os.getenv("ALUSATHI_MODEL_METADATA", "ml/artifacts/potato_mobilenet_v3.metrics.json"))
REGIONAL_EVALUATION_PATH = Path(os.getenv("ALUSATHI_REGIONAL_EVALUATION", "ml/artifacts/regional_evaluation.json"))
MODEL_VERSION = os.getenv("ALUSATHI_MODEL_VERSION", "plantvillage-mobilenet-v3-2026.1")
FIELD_VALIDATED = os.getenv("ALUSATHI_FIELD_VALIDATED", "false").lower() == "true"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
inference_slots = asyncio.Semaphore(2)
request_times: dict[str, deque[float]] = defaultdict(deque)
LABELS = {
    "early_blight": {"en": "Early blight", "bn": "আগাম ধসা রোগ"},
    "healthy": {"en": "No supported blight pattern", "bn": "সমর্থিত ধসার লক্ষণ পাওয়া যায়নি"},
    "late_blight": {"en": "Late blight", "bn": "নাবি ধসা রোগ"},
    "unknown": {"en": "Uncertain result", "bn": "অনিশ্চিত ফলাফল"},
}
NEXT_STEPS = {
    "early_blight": {
        "en": ["Mark the leaf with visible spots.", "Do not water over the leaves; watch the nearby plants for 48 hours.", "Call 16123 or ask an agricultural officer before using any chemical."],
        "bn": ["দাগওয়ালা পাতাটি চিহ্ন দিয়ে রাখুন।", "পাতার উপর পানি দেবেন না; পাশের গাছগুলো ৪৮ ঘণ্টা দেখুন।", "ওষুধ দেওয়ার আগে ১৬১২৩-এ কল করুন বা কৃষি কর্মকর্তাকে জিজ্ঞেস করুন।"],
    },
    "late_blight": {
        "en": ["Do not carry wet leaves or plants to another field.", "Open blocked drainage and photograph nearby plants.", "Call 16123 or ask an agricultural officer before using any chemical."],
        "bn": ["ভেজা পাতা বা গাছ অন্য জমিতে নেবেন না।", "জমির পানি বের হওয়ার পথ খুলে দিন এবং পাশের গাছের ছবি তুলুন।", "ওষুধ দেওয়ার আগে ১৬১২৩-এ কল করুন বা কৃষি কর্মকর্তাকে জিজ্ঞেস করুন।"],
    },
    "healthy": {
        "en": ["This photograph shows no clear early- or late-blight pattern.", "Check the same field places again next week.", "Call 16123 or ask an agricultural officer if spots spread or plants weaken."],
        "bn": ["এই ছবিতে আগাম বা নাবি ধসার পরিষ্কার চিহ্ন পাওয়া যায়নি।", "আগামী সপ্তাহে জমির একই জায়গাগুলো আবার দেখুন।", "দাগ ছড়ালে বা গাছ দুর্বল হলে ১৬১২৩-এ কল করুন বা কৃষি কর্মকর্তাকে জানান।"],
    },
    "unknown": {
        "en": ["Retake two close, clear photographs in daylight.", "Photograph both sides of the same leaf.", "Do not use a chemical from this result; call 16123 or ask an agricultural officer."],
        "bn": ["দিনের আলোতে কাছ থেকে দুটি পরিষ্কার ছবি তুলুন।", "একই পাতার দুই পাশের ছবি দিন।", "এই ফল দেখে ওষুধ দেবেন না; ১৬১২৩-এ কল করুন বা কৃষি কর্মকর্তাকে জিজ্ঞেস করুন।"],
    },
}

app = FastAPI(title="AluSathi demo disease API", version="0.1.0", docs_url=None, redoc_url=None)
app.include_router(auth_router)
app.include_router(marketplace_router)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None
class_names: list[str] = []
model_metadata: dict = {}
regional_evaluation: dict = {}
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def load_model() -> None:
    global model, class_names, model_metadata, regional_evaluation
    if not MODEL_PATH.exists():
        return
    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=True)
    class_names = checkpoint["class_names"]
    loaded = models.mobilenet_v3_small(weights=None)
    loaded.classifier[3] = torch.nn.Linear(loaded.classifier[3].in_features, len(class_names))
    loaded.load_state_dict(checkpoint["state_dict"])
    loaded.eval().to(device)
    model = loaded
    if MODEL_METADATA_PATH.exists():
        with MODEL_METADATA_PATH.open("r", encoding="utf-8") as metadata_file:
            model_metadata = json.load(metadata_file)
    if REGIONAL_EVALUATION_PATH.exists():
        with REGIONAL_EVALUATION_PATH.open("r", encoding="utf-8") as evaluation_file:
            regional_evaluation = json.load(evaluation_file)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.update({
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    })
    return response


@app.exception_handler(Exception)
async def safe_error(_, __):
    return JSONResponse(status_code=500, content={"detail": "Analysis failed safely. Please try another image."})


@app.get("/health")
def health() -> dict:
    return {
        "status": "ready" if model is not None else "model_missing",
        "device": str(device),
        "model": MODEL_PATH.name,
        "model_version": MODEL_VERSION,
        "classes": class_names,
        "test_accuracy": model_metadata.get("test", {}).get("accuracy"),
        "controlled_test_accuracy": model_metadata.get("test", {}).get("accuracy"),
        "regional_test_accuracy": regional_evaluation.get("raw", {}).get("accuracy"),
        "regional_test_images": regional_evaluation.get("images"),
        "field_validated": FIELD_VALIDATED,
        "demo_only": True,
    }


@app.post("/disease/predict")
async def predict(request: Request, file: UploadFile = File(...)) -> dict:
    if model is None:
        raise HTTPException(503, "The disease-screening model is unavailable.")
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    recent = request_times[client]
    while recent and recent[0] < now - 60:
        recent.popleft()
    if len(recent) >= 20:
        raise HTTPException(429, "Too many scans. Please wait one minute.")
    recent.append(now)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a JPEG, PNG, or WebP image.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 8 MB or smaller.")
    try:
        with Image.open(io.BytesIO(content)) as source:
            if source.format not in ALLOWED_FORMATS:
                raise HTTPException(400, "The file content does not match an allowed image type.")
            if min(source.size) < 128 or max(source.size) > 8000:
                raise HTTPException(400, "Image dimensions must be between 128 and 8,000 pixels.")
            source.verify()
        with Image.open(io.BytesIO(content)) as source:
            image = source.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "The uploaded file is not a safe, readable image.")
    quality = image_quality(image)
    quality_warning = bool(quality["issues"])

    async with inference_slots:
        with torch.inference_mode():
            probabilities = torch.softmax(model(preprocess(image).unsqueeze(0).to(device)), dim=1)[0].cpu()
    sorted_values, sorted_indexes = torch.sort(probabilities, descending=True)
    confidence = float(sorted_values[0])
    margin = float(sorted_values[0] - sorted_values[1])
    predicted = class_names[int(sorted_indexes[0])]
    rejection_reasons = list(quality["issues"])
    if confidence < CONFIDENCE_THRESHOLD:
        rejection_reasons.append("low_confidence")
    if margin < MARGIN_THRESHOLD:
        rejection_reasons.append("close_competing_predictions")
    if not FIELD_VALIDATED:
        rejection_reasons.append("field_validation_pending")
    uncertain = should_reject(confidence, margin, quality["issues"]) or not FIELD_VALIDATED
    label = "unknown" if uncertain else predicted

    return {
        "label": label,
        "labels": LABELS[label],
        "confidence": round(confidence, 4),
        "quality_warning": quality_warning,
        "quality": quality,
        "rejection_reasons": rejection_reasons,
        "field_validated": FIELD_VALIDATED,
        # Demo data has field-domain and false-negative risk, so every result stays advisory.
        "needs_expert_review": True,
        "probabilities": {class_names[index]: round(float(probabilities[index]), 4) for index in range(len(class_names))},
        "next_steps": NEXT_STEPS[label],
        "model_scope": "PlantVillage-trained research model; regional testing did not meet the field-use threshold.",
        "treatment_status": "Screening guidance only—confirm chemical decisions with an agricultural expert.",
    }


@app.post("/tuber/inspect")
async def tuber_inspection(request: Request, file: UploadFile = File(...)) -> dict:
    client = request.client.host if request.client else "unknown"
    recent = request_times[client]
    now = time.monotonic()
    while recent and recent[0] < now - 60:
        recent.popleft()
    if len(recent) >= 20:
        raise HTTPException(429, "Please wait one minute.")
    recent.append(now)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a JPEG, PNG or WebP image.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 8 MB or smaller.")
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ALLOWED_FORMATS or min(image.size) < 128 or max(image.size) > 8000:
                raise HTTPException(400, "Use a readable image between 128 and 8,000 pixels.")
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            return await asyncio.to_thread(inspect_tubers, image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "The image could not be read safely.")


load_model()
