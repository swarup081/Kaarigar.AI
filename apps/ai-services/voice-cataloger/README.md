# Voice-to-Listing Cataloger Service

Takes the artisan's voice recording and, when available, the product photo the
phone already enhanced, and returns a publishable multilingual listing.

## Pipeline

One model call does the whole job:

```
Voice recording (m4a) ─┐
                       ├─> Gemini ─> transcript + listing JSON
Enhanced photo (jpg) ──┘
```

Speech recognition, translation and listing generation happen together rather
than as three services. Splitting them adds two network hops and two failure
modes, and loses the context that makes the output good: the model hears the
artisan describing the object while looking at it.

Gemini accepts m4a directly, so there is no transcoding step and `ffmpeg` is
optional. When `ffprobe` is on the host, recordings are length-checked before a
model call is spent on them. When it is absent, that gate is skipped rather than
failing the request.

## Supported languages

Hindi (hi), English (en), Tamil (ta), Bengali (bn).

## Endpoint

```
POST /api/voice-to-listing
Content-Type: multipart/form-data
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `audio` | file | yes | m4a, wav, mp3, aac, ogg, opus, flac, webm |
| `source_language` | string | yes | One of the four codes above |
| `target_languages` | JSON array | no | Defaults to `["en","hi"]` |
| `product_category` | string | no | Hint from the phone, treated as correctable |
| `detected_attributes` | JSON object | no | Dominant colours measured on-device |
| `region` | string | no | **Drives the GI tag shortlist. Send it.** |
| `image` | file | no | The enhanced photo. Improves category and colour accuracy |

`GET /health` reports whether a Gemini key is configured.

See `docs/api-contracts/voice-cataloger.md` for the full response shape.

## Geographical Indication tags

The model never produces a GI tag freely. A GI tag is a legal certification, and
a false one is a claim made in the artisan's name.

Instead, `gi_tags.py` filters the table by the region the artisan named, offers
only that shortlist to the model, and fuzzy-matches whatever comes back against
the same shortlist before it leaves the service. Anything outside the list is
dropped rather than corrected.

The table is a working seed of about sixty entries. The GI Registry publishes
several hundred handicraft entries, and expanding this table is the cheapest
accuracy improvement available to this service.

## Response casing

Requests arrive snake_case, responses go out camelCase. That is not an
oversight: the mobile app sends snake_case form fields but casts the response
onto the camelCase TypeScript types in `packages/shared-types`. The contract
markdown shows snake_case responses and is wrong; a snake_case response would
make every field silently `undefined` in the app.

## Setup

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in this directory:

```bash
GEMINI_API_KEY=your_key        # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
SHARED_API_KEY=same_secret_as_the_gateway
```

Run it:

```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

Try it, skipping the shared-secret check for local work only:

```bash
ALLOW_UNAUTHENTICATED=1 uvicorn main:app --port 8002
curl -X POST http://localhost:8002/api/voice-to-listing \
  -F "audio=@recording.m4a" \
  -F "source_language=hi" \
  -F "region=Varanasi" \
  -F "image=@product.jpg"
```
