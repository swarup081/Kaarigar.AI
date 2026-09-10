"""Development gateway.

The mobile app talks to a single `EXPO_PUBLIC_AI_GATEWAY_URL`, but the services
listen on separate ports. In production the Supabase Edge Function in
`apps/backend/supabase/functions/ai-gateway` does that routing.

Running the real thing locally needs Deno and the Supabase CLI, which is a lot
of moving parts just to try the app. This stands in for it: same paths, same
port for the phone to reach, nothing else to install.

    python dev_gateway.py

Then point the app at http://<your-lan-ip>:8000. Not localhost: a phone's
localhost is the phone, not your machine.

This is for development only. It does no authentication and it is not what
ships. Deploy the edge function for anything real.
"""

from __future__ import annotations

import os
import socket

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

# Same route table as the edge function, so a path that works here works there.
ROUTES = {
    "/enhance-image": "http://127.0.0.1:8001/api/enhance-image",
    "/voice-to-listing": "http://127.0.0.1:8002/api/voice-to-listing",
    "/suggest-price": "http://127.0.0.1:8003/api/suggest-price",
    "/text-to-speech": "http://127.0.0.1:8004/api/text-to-speech",
}

SHARED_API_KEY = os.getenv("SHARED_API_KEY", "")

app = FastAPI(title="Kaarigar Dev Gateway")


def lan_ip() -> str:
    """Best guess at the address a phone on the same Wi-Fi can reach."""
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        address = probe.getsockname()[0]
        probe.close()
        return address
    except OSError:
        return "127.0.0.1"


@app.get("/health")
async def health() -> dict:
    """Reports which services are actually up, so a 404 is easy to diagnose."""
    status = {}
    async with httpx.AsyncClient(timeout=2) as client:
        for path, target in ROUTES.items():
            base = target.rsplit("/api/", 1)[0]
            try:
                response = await client.get(f"{base}/health")
                status[path] = "up" if response.status_code == 200 else f"http {response.status_code}"
            except httpx.HTTPError:
                status[path] = "down"
    return {"gateway": "ok", "reachable_at": f"http://{lan_ip()}:8000", "services": status}


@app.api_route("/{path:path}", methods=["POST", "OPTIONS"])
async def forward(path: str, request: Request):
    if request.method == "OPTIONS":
        return Response(status_code=200, headers={"Access-Control-Allow-Origin": "*"})

    target = ROUTES.get(f"/{path}")
    if not target:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "UNKNOWN_ENDPOINT", "message": f"No route for /{path}"}},
        )

    # Forward the body untouched. Multipart must keep its original boundary,
    # so the content-type header is passed through rather than rebuilt.
    headers = {}
    if content_type := request.headers.get("content-type"):
        headers["content-type"] = content_type
    if SHARED_API_KEY:
        headers["X-API-Key"] = SHARED_API_KEY

    body = await request.body()

    try:
        # Generous timeout: voice-to-listing is one long multimodal call.
        async with httpx.AsyncClient(timeout=120) as client:
            upstream = await client.post(target, content=body, headers=headers)
    except httpx.HTTPError as error:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "AI_SERVICE_UNAVAILABLE",
                    "message": f"Could not reach {target}. Is that service running? ({error})",
                }
            },
        )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "application/json"),
        headers={"Access-Control-Allow-Origin": "*"},
    )


if __name__ == "__main__":
    import uvicorn

    print(f"\n  Point the app at:  http://{lan_ip()}:8000")
    print("  Check services at: /health\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
