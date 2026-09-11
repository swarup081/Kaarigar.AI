"""Gemini call for the voice-to-listing step.

One request does speech recognition, translation and listing generation
together. Splitting them across a speech model, a translation model and a text
model adds two network hops and two failure modes, and loses the context that
makes the result good: the model hears the artisan and sees the product at the
same time.
"""

from __future__ import annotations

from google import genai
from google.genai import types

from config import LANGUAGE_NAMES, settings
from gi_tags import GITag, format_for_prompt
from retry import with_retry
from schemas import GeminiListingPayload

_client: genai.Client | None = None


def client() -> genai.Client:
    """Lazily built singleton, so importing this module never needs a key."""
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


SYSTEM_PROMPT = """\
You write product listings for Indian artisans selling handmade crafts.

The artisan speaks about their product in their own language. You hear the
recording and, usually, see a photo of the item. From those you produce a
listing good enough to publish on ONDC, Amazon Karigar or a WhatsApp catalogue.

These rules are absolute. Breaking one causes real harm to a real person whose
name goes on the listing.

1. NEVER invent a fact. If the artisan did not say a measurement, a weight, a
   thread count, a price or a material, the field is null and the bullet is not
   written. An empty field is correct. A plausible guess is not.
2. NEVER claim a Geographical Indication tag unless it appears in the shortlist
   below AND the artisan's description clearly matches it. Otherwise null. A GI
   tag is a legal certification, not a descriptive flourish.
3. NEVER claim an award, a certification, a government scheme membership, an
   export history or a named lineage.
4. Transcribe verbatim, in the script of the language spoken. Do not tidy
   grammar, do not translate inside the transcript field.
5. Describe only what is visible in the photo and audible in the recording. If
   the photo is unclear, rely on the recording alone.

On the heritage story: general, well-known cultural context about the craft
tradition is allowed and welcome. Specific claims about this artisan or this
object are not.

On style: write plainly. Artisans read these back and buyers skim them. Titles
lead with material, technique and region because that is how Indian marketplace
search works. Keep bullets short and concrete.
"""


def build_prompt(
    source_language: str,
    target_languages: list[str],
    gi_shortlist: list[GITag],
    category_hint: str | None,
    color_hint: list[str] | None,
    has_image: bool,
) -> str:
    """Assembles the per-request half of the prompt."""
    languages = ", ".join(
        f"{LANGUAGE_NAMES.get(code, code)} ({code})" for code in target_languages
    )
    spoken = LANGUAGE_NAMES.get(source_language, source_language)

    lines = [
        f"The artisan is speaking {spoken}.",
        f"Write the listing in these languages: {languages}.",
        "Leave every other language field null.",
        "",
        "Geographical Indication tags you may choose from:",
        format_for_prompt(gi_shortlist),
        "",
    ]

    if has_image:
        lines.append(
            "A photo of the product is attached. Use it to judge the category, the "
            "colours and whether the item is patterned."
        )
    else:
        lines.append("No photo is attached. Judge everything from the recording alone.")

    if category_hint:
        lines.append(
            f"The app's earlier guess at the category was '{category_hint}'. Treat it as "
            "a hint, not a fact, and correct it if the photo or recording disagrees."
        )

    if color_hint:
        lines.append(
            "Colours measured from the photo, as hex: "
            + ", ".join(color_hint)
            + ". Convert them to plain colour names a buyer would search for."
        )

    return "\n".join(lines)


def generate_listing(
    *,
    audio_bytes: bytes,
    audio_mime: str,
    image_bytes: bytes | None,
    image_mime: str | None,
    source_language: str,
    target_languages: list[str],
    gi_shortlist: list[GITag],
    category_hint: str | None,
    color_hint: list[str] | None,
) -> GeminiListingPayload:
    """Runs the single multimodal call and returns a validated payload."""
    parts: list[types.Part] = [
        types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime),
    ]

    if image_bytes and image_mime:
        parts.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime))

    parts.append(
        types.Part.from_text(
            text=build_prompt(
                source_language=source_language,
                target_languages=target_languages,
                gi_shortlist=gi_shortlist,
                category_hint=category_hint,
                color_hint=color_hint,
                has_image=image_bytes is not None,
            )
        )
    )

    response = with_retry(
        lambda: client().models.generate_content(
            model=settings.gemini_model,
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=GeminiListingPayload,
                # Low but not zero. Listings need some fluency; facts are pinned
                # by the schema and the rules, not by the temperature.
                temperature=0.3,
            ),
        ),
        label="voice-to-listing",
    )

    parsed = response.parsed
    if isinstance(parsed, GeminiListingPayload):
        return parsed

    # The SDK returns None when the model produced JSON it could not coerce.
    # Validating the raw text ourselves gives a usable error instead of a crash.
    return GeminiListingPayload.model_validate_json(response.text or "")
