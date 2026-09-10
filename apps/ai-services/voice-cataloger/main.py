"""Kaarigar — Voice-to-Listing service.

POST /api/voice-to-listing

Takes the artisan's voice recording and, optionally, the enhanced product photo
the phone produced, and returns a publishable multilingual listing.

Contract: docs/api-contracts/voice-cataloger.md
Run:      uvicorn main:app --host 0.0.0.0 --port 8002 --reload
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import time
import uuid

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

import gi_tags
from audio import duration_seconds, mime_for
from config import SUPPORTED_LANGUAGES, settings
from gemini import generate_listing
from schemas import (
    GeminiListingPayload,
    ListingResults,
    TranscriptionResult,
    VoiceToListingResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("voice-cataloger")

app = FastAPI(title="Kaarigar Voice Cataloger", version="0.1.0")


# ─── Helpers ──────────────────────────────────


def _check_api_key(provided: str | None) -> None:
    """The gateway forwards the shared secret. Local development can opt out."""
    if settings.allow_unauthenticated:
        return
    if not settings.shared_api_key:
        raise HTTPException(500, "SHARED_API_KEY is not configured on this service")
    if provided != settings.shared_api_key:
        raise HTTPException(401, "Invalid or missing X-API-Key")


def _failure(code: str, message: str, started: float, status: int = 400) -> JSONResponse:
    body = VoiceToListingResponse(
        job_id=str(uuid.uuid4()),
        status="failed",
        error={"code": code, "message": message},
        processing_time_ms=int((time.monotonic() - started) * 1000),
    )
    return JSONResponse(status_code=status, content=body.model_dump(by_alias=True))


def _parse_json_field(raw: str | None, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _strip_empty(mapping: dict) -> dict:
    """Drops null and empty entries so the app never renders a blank language."""
    return {k: v for k, v in mapping.items() if v not in (None, "", [], {})}


def _shape_listing(payload: GeminiListingPayload, resolved_gi: str | None) -> dict:
    """Reshapes the model output into the structure the app's types expect."""
    listing = payload.listing
    attributes = listing.extracted_attributes

    return {
        "title": _strip_empty(listing.title.model_dump()),
        "description": _strip_empty(listing.description.model_dump()),
        "bulletFeatures": _strip_empty(listing.bullet_features.model_dump()),
        "heritageStory": _strip_empty(listing.heritage_story.model_dump()),
        "extractedAttributes": _strip_empty(
            {
                "material": attributes.material,
                "technique": attributes.technique,
                "region": attributes.region,
                # Never the model's raw answer. Always the shortlist match.
                "giTag": resolved_gi,
                "colors": attributes.colors,
                "suitableFor": attributes.suitable_for,
                "category": attributes.category,
                "subCategory": attributes.sub_category,
                "hasPattern": attributes.has_pattern,
                "patternType": attributes.pattern_type,
            }
        ),
    }


# ─── Routes ───────────────────────────────────


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "voice-cataloger",
        "model": settings.gemini_model,
        "gemini_configured": bool(settings.gemini_api_key),
    }


@app.post("/api/voice-to-listing")
async def voice_to_listing(
    audio: UploadFile = File(..., description="Voice recording, m4a/wav/mp3"),
    source_language: str = Form(...),
    target_languages: str | None = Form(None),
    product_category: str | None = Form(None),
    detected_attributes: str | None = Form(None),
    region: str | None = Form(None),
    image: UploadFile | None = File(None, description="Enhanced product photo"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    started = time.monotonic()
    _check_api_key(x_api_key)

    # ─── Validate the language ───────────────

    if source_language not in SUPPORTED_LANGUAGES:
        return _failure(
            "LANGUAGE_NOT_SUPPORTED",
            f"'{source_language}' is not one of {', '.join(SUPPORTED_LANGUAGES)}",
            started,
        )

    targets = _parse_json_field(target_languages, ["en", "hi"])
    targets = [code for code in targets if code in SUPPORTED_LANGUAGES]
    if source_language not in targets:
        targets.append(source_language)
    if not targets:
        return _failure("LANGUAGE_NOT_SUPPORTED", "No supported target languages", started)

    # ─── Validate the audio ──────────────────

    audio_bytes = await audio.read()
    if len(audio_bytes) > settings.max_audio_bytes:
        return _failure("AUDIO_TOO_LONG", "Recording exceeds 30 MB", started, 413)
    if not audio_bytes:
        return _failure("PROCESSING_ERROR", "Empty audio upload", started)

    audio_mime = mime_for(audio.filename, audio.content_type)
    if not audio_mime:
        return _failure(
            "PROCESSING_ERROR",
            f"Unsupported audio format: {audio.filename or audio.content_type}",
            started,
        )

    # ffprobe is optional. When it is absent the gate is skipped rather than
    # failing the request, so the service still runs on a bare container.
    suffix = os.path.splitext(audio.filename or "recording.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
        handle.write(audio_bytes)
        probe_path = handle.name

    try:
        seconds = duration_seconds(probe_path)
    finally:
        os.unlink(probe_path)

    if seconds is not None:
        if seconds < settings.min_audio_seconds:
            return _failure(
                "AUDIO_TOO_SHORT",
                f"Recording is {seconds:.1f}s, minimum is {settings.min_audio_seconds:.0f}s",
                started,
            )
        if seconds > settings.max_audio_seconds:
            return _failure(
                "AUDIO_TOO_LONG",
                f"Recording is {seconds:.0f}s, maximum is {settings.max_audio_seconds:.0f}s",
                started,
            )

    # ─── Optional photo ──────────────────────

    image_bytes: bytes | None = None
    image_mime: str | None = None
    if image is not None:
        image_bytes = await image.read()
        if len(image_bytes) > settings.max_image_bytes:
            image_bytes = None
        else:
            image_mime = image.content_type or "image/jpeg"

    # ─── Hints carried over from the phone ───

    attributes = _parse_json_field(detected_attributes, {}) or {}
    color_hint = attributes.get("dominantColors") or attributes.get("dominant_colors")
    category_hint = product_category or attributes.get("productCategoryGuess")

    shortlist = gi_tags.shortlist(region, category_hint)

    # ─── The one model call ──────────────────

    try:
        payload = generate_listing(
            audio_bytes=audio_bytes,
            audio_mime=audio_mime,
            image_bytes=image_bytes,
            image_mime=image_mime,
            source_language=source_language,
            target_languages=targets,
            gi_shortlist=shortlist,
            category_hint=category_hint,
            color_hint=color_hint,
        )
    except RuntimeError as error:
        log.error("configuration error: %s", error)
        return _failure("LLM_FAILED", str(error), started, 500)
    except Exception as error:  # noqa: BLE001 - the boundary must not leak stack traces
        log.exception("Gemini call failed")
        return _failure("LLM_FAILED", f"Listing generation failed: {error}", started, 502)

    # A model that could not hear the recording will say so through the
    # confidence score. Better to ask for a re-record than to publish guesswork.
    if payload.transcription_quality < 0.4 or not payload.transcript.strip():
        return _failure(
            "AUDIO_TOO_NOISY",
            "The recording could not be understood clearly enough to write a listing",
            started,
        )

    resolved_gi = gi_tags.resolve(payload.listing.extracted_attributes.gi_tag, shortlist)

    response = VoiceToListingResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        results=ListingResults(
            transcription=TranscriptionResult(
                original_text=payload.transcript,
                language_detected=payload.detected_language,
                confidence=round(payload.transcription_quality, 2),
            ),
            listing=_shape_listing(payload, resolved_gi),
        ),
        processing_time_ms=int((time.monotonic() - started) * 1000),
    )

    log.info(
        "listing generated in %sms, language=%s, gi=%s",
        response.processing_time_ms,
        payload.detected_language,
        resolved_gi or "none",
    )
    return JSONResponse(content=response.model_dump(by_alias=True, exclude_none=True))
