"""Both services in one process, on one port, behind the gateway's paths.

`dev_gateway.py` routes between separately running services on your machine.
This is the deployable equivalent: a single ASGI app that serves every route
the mobile app calls, so there is one container, one URL and no internal
networking to configure.

That matters because a standalone APK needs a stable public address baked in
at build time. One deployment gives you one address.

    uvicorn serve_all:app --host 0.0.0.0 --port 8000

Routes match the edge function and `dev_gateway.py` exactly, so an APK built
against a local gateway works against a deployed one with only the URL changed:

    POST /voice-to-listing
    POST /suggest-price
    GET  /health

Not built, and deliberately absent rather than stubbed: /enhance-image runs on
the phone, and /text-to-speech does not exist yet. A 404 from here is a more
honest answer than an endpoint that always fails.
"""

from __future__ import annotations

import importlib
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

HERE = os.path.dirname(os.path.abspath(__file__))


def load(directory: str):
    """Imports one service, isolated from the other.

    Both services legitimately use bare module names (main, config, schemas)
    because each is designed to deploy on its own. Importing both into one
    process makes those collide and Python hands back whichever was cached
    first, so each load gets a clean path and a purged cache.
    """
    for module in ("main", "config", "schemas", "gemini", "pricing", "gi_tags", "audio", "retry"):
        sys.modules.pop(module, None)

    path = os.path.join(HERE, directory)
    sys.path = [path] + [
        p for p in sys.path
        if p not in (os.path.join(HERE, "voice-cataloger"), os.path.join(HERE, "pricing-engine"))
    ]
    importlib.invalidate_caches()
    return importlib.import_module("main")


voice = load("voice-cataloger")
pricing = load("pricing-engine")

app = FastAPI(title="Kaarigar AI Services")

# The app is not a browser, but a deployed URL often gets poked from one.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

# Reuse the route handlers rather than re-implementing them, so these paths
# cannot drift from the services' own behaviour.
app.post("/voice-to-listing")(voice.voice_to_listing)
app.post("/suggest-price")(pricing.suggest_price)


@app.get("/")
async def root() -> dict:
    return {
        "service": "kaarigar-ai",
        "endpoints": ["POST /voice-to-listing", "POST /suggest-price", "GET /health"],
        "note": "image enhancement runs on the phone, not here",
    }


@app.get("/health")
async def health() -> dict:
    # Both services expose health as a plain function, not a coroutine.
    return {
        "status": "ok",
        "voice_cataloger": voice.health(),
        "pricing_engine": pricing.health(),
    }


if __name__ == "__main__":
    import uvicorn

    # Hosting platforms assign the port through the environment.
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
