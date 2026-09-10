"""Configuration for the pricing engine."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # See the note in voice-cataloger/config.py: the 2.5 family is refused for
    # new API keys. Keep these two defaults in step.
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    shared_api_key: str = os.getenv("SHARED_API_KEY", "")
    allow_unauthenticated: bool = os.getenv("ALLOW_UNAUTHENTICATED", "0") == "1"

    # Optional. When set, market comparables are read from the price_references
    # table instead of being estimated by the model.
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    @property
    def has_reference_db(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)


settings = Settings()

LANGUAGE_NAMES = {"hi": "Hindi", "en": "English", "ta": "Tamil", "bn": "Bengali"}
