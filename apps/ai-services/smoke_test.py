"""Live smoke test for the Kaarigar AI services.

Checks the things that would actually hurt someone if they broke:

* the configured Gemini model is callable at all
* a vague recording does not get embellished into invented facts
* a hallucinated Geographical Indication tag is dropped
* the recommended price can never fall below cost plus a fair margin

Test speech is synthesised with Gemini's own text-to-speech, so no audio
fixtures are committed and the whole thing runs from a bare checkout.

Usage:
    export GEMINI_API_KEY=...
    python smoke_test.py
"""

from __future__ import annotations

import importlib
import io
import json
import os
import re
import sys
import wave

os.environ.setdefault("ALLOW_UNAUTHENTICATED", "1")

HERE = os.path.dirname(os.path.abspath(__file__))

# Each service is deployed in its own container with its own virtualenv, so
# both legitimately use bare module names: main, config, schemas. Importing
# both into one process makes those collide, and Python hands back whichever
# was cached first. Loading each service behind a clean path and a purged
# module cache is what keeps this runner honest.
_SERVICE_MODULES = ("main", "config", "schemas", "gemini", "pricing", "gi_tags", "audio", "retry")


def load_service(directory: str, *names: str):
    """Imports modules from one service directory, isolated from the others."""
    for module in _SERVICE_MODULES:
        sys.modules.pop(module, None)

    path = os.path.join(HERE, directory)
    sys.path = [path] + [p for p in sys.path if p not in (os.path.join(HERE, "voice-cataloger"), os.path.join(HERE, "pricing-engine"))]
    importlib.invalidate_caches()
    return tuple(importlib.import_module(name) for name in names)

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402

TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str]] = []


def check(name: str, ok: bool) -> None:
    results.append((PASS if ok else FAIL, name))
    print(f"  {PASS if ok else FAIL}  {name}")


def synthesise(client: genai.Client, hindi: str, voice: str = "Kore") -> bytes:
    """Renders Hindi text to a 24 kHz mono WAV, in memory."""
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=f"Say this plainly, like an Indian artisan speaking: {hindi}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                )
            ),
        ),
    )
    pcm = response.candidates[0].content.parts[0].inline_data.data

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(24000)
        handle.writeframes(pcm)
    return buffer.getvalue()


def test_voice(client: genai.Client) -> None:
    from fastapi.testclient import TestClient

    (voice_main,) = load_service("voice-cataloger", "main")
    print("\nvoice-cataloger")
    api = TestClient(voice_main.app)

    # A deliberately thin description. The artisan names a material and one
    # property, nothing else. A region is passed in anyway, so the GI shortlist
    # is non-empty and the model has something to be tempted by.
    audio = synthesise(
        client,
        "यह मिट्टी का घड़ा है। मैंने खुद बनाया है। पानी ठंडा रहता है इसमें।",
        voice="Charon",
    )

    body = api.post(
        "/api/voice-to-listing",
        files={"audio": ("v.wav", audio, "audio/wav")},
        data={
            "source_language": "hi",
            "target_languages": '["hi","en"]',
            "region": "Rajasthan",
            "product_category": "pottery",
        },
    ).json()

    if body.get("status") != "completed":
        error = body.get("error") or {}
        check("request succeeded", False)
        print(f"        {error.get('code')}: {error.get('message')}")
        return

    listing = body["results"]["listing"]
    attributes = listing["extractedAttributes"]
    blob = json.dumps(listing, ensure_ascii=False).lower()

    check("response is camelCase", "jobId" in body and "bulletFeatures" in listing)
    check("transcript returned", bool(body["results"]["transcription"]["originalText"]))
    check("no GI tag invented", "giTag" not in attributes)
    check("no region invented", attributes.get("region") is None)
    check(
        "no measurement invented",
        not re.search(r"\d+\s*(cm|inch|litre|liter|ml|मीटर|सेमी|लीटर)", blob),
    )
    check(
        "no award or certification claimed",
        not any(w in blob for w in ("award", "certified", "certification", "पुरस्कार")),
    )

    # Validation gates should reject before a model call is spent.
    bad = api.post(
        "/api/voice-to-listing",
        files={"audio": ("v.wav", audio, "audio/wav")},
        data={"source_language": "fr"},
    ).json()
    check("unsupported language rejected", bad["error"]["code"] == "LANGUAGE_NOT_SUPPORTED")


def test_pricing() -> None:
    from fastapi.testclient import TestClient

    pricing_main, pricing_schemas = load_service("pricing-engine", "main", "schemas")
    Adjustment = pricing_schemas.Adjustment
    Comparable = pricing_schemas.Comparable
    PricingAdvice = pricing_schemas.PricingAdvice

    print("\npricing-engine")
    api = TestClient(pricing_main.app)
    request = {
        "category": "textile",
        "material": "silk",
        "technique": "handloom",
        "region": "Varanasi",
        "giTag": "Banaras Brocades and Sarees",
        "rawMaterialCost": 400,
        "laborHours": 8,
        "language": "hi",
    }

    body = api.post("/api/suggest-price", json=request).json()
    floor = body["reasoning"]["costBreakdown"]
    minimum = floor["floorPrice"] + floor["fairMargin"]

    check("live model answered", body["reasoning"]["degraded"] is False)
    check("reasoning is bilingual", bool(body["reasoning"]["summaryRegional"]))
    check("every adjustment carries a reason", all(a["reason"] for a in body["reasoning"]["adjustments"]))
    check(
        "comparables labelled as estimates",
        all(m["source"] == "ai_estimate" for m in body["reasoning"]["marketComparables"]),
    )
    check("price at or above the fair minimum", body["suggestedPrice"]["recommended"] >= minimum)

    # Now force a model that tries to price below cost. The clamp must win.
    original = pricing_main.client
    pricing_main.client = lambda: type(
        "C",
        (),
        {
            "models": type(
                "M",
                (),
                {
                    "generate_content": lambda self, **kw: type(
                        "R",
                        (),
                        {
                            "parsed": PricingAdvice(
                                adjustments=[
                                    Adjustment(factor="Undercut", impact_percent=-30, reason="x")
                                ],
                                comparables=[Comparable(title="x", price=1)],
                                summary_en="x",
                                summary_regional="x",
                                confidence=0.1,
                            ),
                            "text": "",
                        },
                    )()
                },
            )()
        },
    )()

    clamped = api.post("/api/suggest-price", json=request).json()
    check("below-cost suggestion clamped", clamped["suggestedPrice"]["recommended"] >= minimum)
    pricing_main.client = original

    empty = api.post("/api/suggest-price", json={"category": "pottery"})
    check("missing cost data refused", empty.status_code == 400)


def main() -> int:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("GEMINI_API_KEY is not set")
        return 2

    client = genai.Client(api_key=key)

    config, retry = load_service("voice-cataloger", "config", "retry")
    print(f"model: {config.settings.gemini_model}")
    try:
        # Through the same retry the services use. Without it a transient 503,
        # which Gemini returns routinely under load, fails the whole suite and
        # looks like a real regression.
        retry.with_retry(
            lambda: client.models.generate_content(
                model=config.settings.gemini_model, contents="ok"
            ),
            label="preflight",
        )
        check("configured model is callable", True)
    except Exception as error:  # noqa: BLE001
        print(f"  {FAIL}  configured model is callable: {str(error)[:160]}")
        results.append((FAIL, "configured model is callable"))
        return 1

    test_voice(client)
    test_pricing()

    failures = [name for status, name in results if status == FAIL]
    print(f"\n{len(results) - len(failures)}/{len(results)} passed")
    if failures:
        print("failed: " + ", ".join(failures))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
