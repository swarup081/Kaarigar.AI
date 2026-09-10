"""Configuration for the voice cataloger service."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Environment-backed settings, read once at import."""

    # Gemini. The model is configurable because Google retires these on a
    # rolling schedule. gemini-2.5-flash is already refused for new API keys
    # ("no longer available to new users"), which is exactly why this is an
    # env var and why the services degrade instead of crashing when a model
    # disappears. Verified working: the 3.x flash family.
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Shared secret the AI gateway forwards as X-API-Key.
    shared_api_key: str = os.getenv("SHARED_API_KEY", "")
    # Set to "1" only for local development against curl.
    allow_unauthenticated: bool = os.getenv("ALLOW_UNAUTHENTICATED", "0") == "1"

    # Audio limits. These mirror docs/api-contracts/voice-cataloger.md.
    max_audio_bytes: int = 30 * 1024 * 1024
    min_audio_seconds: float = 3.0
    max_audio_seconds: float = 300.0

    max_image_bytes: int = 10 * 1024 * 1024

    request_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT", "90"))


settings = Settings()

SUPPORTED_LANGUAGES = ("hi", "en", "ta", "bn")

LANGUAGE_NAMES = {
    "hi": "Hindi",
    "en": "English",
    "ta": "Tamil",
    "bn": "Bengali",
}
