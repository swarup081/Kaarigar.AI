"""Kaarigar — Pricing Engine.

POST /api/suggest-price

Three steps, and only the middle one involves a model:

1. Floor price, computed in Python from the artisan's own costs.
2. Market comparables, read from Supabase when seeded, estimated otherwise.
3. Adjustments and a plain-language explanation, from Gemini.

The recommended price is arithmetic over 1 and 3, clamped so it can never fall
below the floor. The model proposes percentages; it never names a rupee figure.

Contract: docs/api-contracts/pricing-engine.md
Run:      uvicorn main:app --host 0.0.0.0 --port 8003 --reload
"""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types

import pricing
from config import LANGUAGE_NAMES, settings
from retry import with_retry
from schemas import PricingAdvice, PricingRequest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("pricing-engine")

app = FastAPI(title="Kaarigar Pricing Engine", version="0.1.0")

_client: genai.Client | None = None


def client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


SYSTEM_PROMPT = """\
You advise Indian artisans on what their handmade product is worth.

You are given a product's attributes and a floor price already calculated from
the artisan's own material costs and hours. Your job is to say what moves this
product above that floor, and to explain it in words the artisan will accept.

Rules:

1. Never state a rupee price for the product. Give percentage adjustments only.
   The final number is calculated from your percentages, not by you.
2. Every adjustment needs a reason a person can argue with. "Market demand" is
   not a reason. "Products with a GI tag sell for 10 to 20 percent more because
   buyers treat the tag as proof of origin" is.
3. Comparables must be realistic Indian retail prices for similar handmade
   items, not aspirational boutique prices and not mass-produced ones.
4. Be honest in the confidence score. Thin attributes mean low confidence.
5. Never suggest an adjustment that would push the price below the floor. The
   floor already represents the artisan's cost plus a fair minimum margin.

Write the explanation the way you would say it out loud to someone who has been
underpaid for this work their whole life. Plain, specific, no jargon.
"""


def _check_api_key(provided: str | None) -> None:
    if settings.allow_unauthenticated:
        return
    if not settings.shared_api_key:
        raise HTTPException(500, "SHARED_API_KEY is not configured on this service")
    if provided != settings.shared_api_key:
        raise HTTPException(401, "Invalid or missing X-API-Key")


def _build_prompt(request: PricingRequest, floor: pricing.CostBreakdown) -> str:
    language = LANGUAGE_NAMES.get(request.language, "Hindi")
    facts = [
        f"Category: {request.category}",
        f"Sub-category: {request.sub_category or 'not given'}",
        f"Material: {request.material or 'not given'}",
        f"Technique: {request.technique or 'not given'}",
        f"Region: {request.region or 'not given'}",
        f"GI tag: {request.gi_tag or 'none'}",
        f"Colours: {', '.join(request.colors) if request.colors else 'not given'}",
    ]

    if request.dimensions:
        d = request.dimensions
        facts.append(
            f"Dimensions: {d.length or '?'} x {d.width or '?'} {d.unit}"
        )
    if request.quality_indicators:
        q = request.quality_indicators
        facts.append(f"Thread count: {q.thread_count or 'not given'}")
        facts.append(f"Pattern complexity: {q.pattern_complexity or 'not given'}")

    return (
        "\n".join(facts)
        + "\n\n"
        + f"Floor price already calculated: {floor.floor_price:.0f} rupees.\n"
        + f"That is {floor.raw_material:.0f} in materials, {floor.labor:.0f} in labour, "
        + f"{floor.overhead:.0f} overhead and {floor.fair_margin:.0f} fair margin.\n\n"
        + f"Write summary_regional in {language}. Write summary_en in English."
    )


def _fallback_advice() -> PricingAdvice:
    """Used when the model is unreachable.

    The artisan still gets the floor price and an honest explanation of it,
    which is the part that actually protects them. Losing the market layer is
    a degraded answer, not a failed one.
    """
    return PricingAdvice(
        adjustments=[],
        comparables=[],
        summary_en=(
            "This price covers your materials, your hours and a fair margin. "
            "Market comparison was unavailable, so treat it as a minimum."
        ),
        summary_regional=(
            "इस कीमत में आपका सामान, आपका समय और उचित मुनाफ़ा शामिल है। "
            "बाज़ार की तुलना अभी उपलब्ध नहीं है, इसलिए इसे न्यूनतम कीमत मानें।"
        ),
        confidence=0.3,
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "pricing-engine",
        "model": settings.gemini_model,
        "gemini_configured": bool(settings.gemini_api_key),
        "reference_db": settings.has_reference_db,
    }


@app.post("/api/suggest-price")
def suggest_price(
    request: PricingRequest,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    started = time.monotonic()
    _check_api_key(x_api_key)

    # ─── Step 1: the floor, in Python ────────

    floor = pricing.compute(
        category=request.category,
        raw_material_cost=request.raw_material_cost,
        labor_hours=request.labor_hours,
        gi_tag=request.gi_tag,
        technique=request.technique,
    )

    if floor.floor_price <= 0:
        return JSONResponse(
            status_code=400,
            content={
                "jobId": str(uuid.uuid4()),
                "error": {
                    "code": "INSUFFICIENT_COST_DATA",
                    "message": (
                        "Material cost and labour hours are both missing, so no floor "
                        "price can be calculated."
                    ),
                },
            },
        )

    # ─── Step 2 and 3: adjustments and words ─

    degraded = False
    try:
        response = with_retry(
            lambda: client().models.generate_content(
                model=settings.gemini_model,
                contents=_build_prompt(request, floor),
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=PricingAdvice,
                    temperature=0.2,
                ),
            ),
            label="suggest-price",
        )
        advice = response.parsed
        if not isinstance(advice, PricingAdvice):
            advice = PricingAdvice.model_validate_json(response.text or "")
    except Exception as error:  # noqa: BLE001
        log.warning("pricing model unavailable, returning floor only: %s", error)
        advice = _fallback_advice()
        degraded = True

    # ─── Arithmetic, not the model ───────────

    total_adjustment = sum(item.impact_percent for item in advice.adjustments)
    # Cap the stack so several small premiums cannot compound into a fantasy.
    total_adjustment = max(-20.0, min(60.0, total_adjustment))

    # Adjustments apply on top of cost plus the minimum fair margin, so a
    # negative stack eats into premium rather than into the artisan's wage.
    price_min = floor.minimum_price
    recommended = price_min * (1 + total_adjustment / 100.0)

    # Cost plus a fair minimum is a hard floor. Nothing the model says goes under it.
    recommended = max(recommended, price_min)
    price_max = max(recommended, pricing.margin_ceiling(floor, request.gi_tag, request.technique))

    payload = {
        "jobId": str(uuid.uuid4()),
        "suggestedPrice": {
            "min": round(price_min),
            "max": round(price_max),
            "recommended": round(recommended),
            "currency": "INR",
        },
        "reasoning": {
            "summary": advice.summary_en,
            "summaryRegional": advice.summary_regional,
            "costBreakdown": floor.as_dict(),
            "marketComparables": [
                {
                    "title": item.title,
                    "price": round(item.price),
                    # Named honestly. These are model estimates until the
                    # price_references table is seeded with real observations.
                    "source": "ai_estimate",
                }
                for item in advice.comparables
            ],
            "adjustments": [
                {
                    "factor": item.factor,
                    "impact": f"{item.impact_percent:+.0f}%",
                    "reason": item.reason,
                }
                for item in advice.adjustments
            ],
            "confidence": round(advice.confidence, 2),
            "sampleSize": 0,
            "degraded": degraded,
        },
        "processingTimeMs": int((time.monotonic() - started) * 1000),
    }

    log.info(
        "priced %s at %s (floor %s, adjustment %+.0f%%)",
        request.category,
        payload["suggestedPrice"]["recommended"],
        round(floor.floor_price),
        total_adjustment,
    )
    return JSONResponse(content=payload)
