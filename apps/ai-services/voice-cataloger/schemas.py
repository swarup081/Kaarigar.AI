"""Request and response models for the voice cataloger.

Two naming conventions meet here, so both are handled explicitly:

* The mobile app sends multipart form fields in snake_case.
* The mobile app reads the response through the TypeScript types in
  ``packages/shared-types/src/ai-requests.ts``, which are camelCase.

The contract markdown shows snake_case responses, which does not match those
types. The TypeScript wins, because the app casts the JSON straight onto it and
a mismatch would silently make every field undefined. See the note in
AI_REQUIREMENTS.md; the contract doc needs correcting.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

LanguageCode = Literal["hi", "en", "ta", "bn"]


class CamelModel(BaseModel):
    """Emits camelCase, accepts either casing on the way in."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ─── What Gemini is asked to produce ──────────
# These are the response schema handed to the model, so every docstring and
# field description below is part of the prompt. Wording matters.


class ExtractedAttributes(BaseModel):
    material: str | None = Field(
        None, description="Primary material, only if the speaker named it. Else null."
    )
    technique: str | None = Field(
        None, description="Making technique, only if the speaker named it. Else null."
    )
    region: str | None = Field(
        None, description="Place of origin, only if the speaker named it. Else null."
    )
    gi_tag: str | None = Field(
        None,
        description=(
            "Geographical Indication tag. Choose ONLY from the shortlist given in the "
            "prompt, and only when the speaker's description clearly matches it. "
            "Null in every other case. Never invent one."
        ),
    )
    colors: list[str] = Field(
        default_factory=list, description="Plain colour names, English, lowercase."
    )
    suitable_for: list[str] = Field(
        default_factory=list,
        description="Occasions or uses, such as wedding, festive, daily_wear, gifting.",
    )
    category: str | None = Field(
        None,
        description=(
            "One of: textile, pottery, jewelry, woodwork, metalwork, leather, bamboo, "
            "stone_carving, painting, embroidery, other. Judge from the photo and the "
            "description together."
        ),
    )
    sub_category: str | None = Field(
        None, description="Specific item type, such as dupatta, diya, jhumka."
    )
    has_pattern: bool = Field(
        False, description="Whether the product carries a visible decorative pattern."
    )
    pattern_type: str | None = Field(
        None, description="Pattern family, such as floral, geometric, paisley. Null if plain."
    )


class MultilingualText(BaseModel):
    hi: str | None = None
    en: str | None = None
    ta: str | None = None
    bn: str | None = None


class MultilingualBullets(BaseModel):
    hi: list[str] = Field(default_factory=list)
    en: list[str] = Field(default_factory=list)
    ta: list[str] = Field(default_factory=list)
    bn: list[str] = Field(default_factory=list)


class GeneratedListing(BaseModel):
    """The listing itself, in every requested language."""

    title: MultilingualText = Field(
        description=(
            "Marketplace title. Lead with material, technique and region because that "
            "is how Indian marketplace search works. Under 80 characters."
        )
    )
    description: MultilingualText = Field(
        description="Two or three sentences. Only facts the speaker gave or the photo shows."
    )
    bullet_features: MultilingualBullets = Field(
        description="Four to six short bullets. No invented measurements."
    )
    heritage_story: MultilingualText = Field(
        description=(
            "Two sentences on the craft tradition. General cultural context is allowed "
            "here, but never claim an award, a certification or a specific lineage."
        )
    )
    extracted_attributes: ExtractedAttributes


class GeminiListingPayload(BaseModel):
    """Exactly what the model returns, before we reshape it for the app."""

    transcript: str = Field(
        description="Verbatim transcription in the language spoken, original script."
    )
    detected_language: LanguageCode = Field(description="Language actually spoken.")
    transcription_quality: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "How confidently the audio was understood. Below 0.5 means noisy, "
            "unclear or largely inaudible."
        ),
    )
    listing: GeneratedListing


# ─── What the app receives ────────────────────


class TranscriptionResult(CamelModel):
    original_text: str
    language_detected: LanguageCode
    confidence: float


class ListingResults(CamelModel):
    transcription: TranscriptionResult
    listing: dict


class VoiceToListingResponse(CamelModel):
    job_id: str
    status: Literal["completed", "failed"]
    results: ListingResults | None = None
    error: dict | None = None
    processing_time_ms: int


class ErrorBody(CamelModel):
    code: str
    message: str
