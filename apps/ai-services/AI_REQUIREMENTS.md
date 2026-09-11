# Kaarigar AI Services — Model Selection & Requirements

> **Owner:** AI/ML teammate · **Scope:** `apps/ai-services/` only
> **Status:** partly implemented, see Section 1a · **Last updated:** 2026-09-10
> **Read first:** `docs/api-contracts/` defines the JSON these services must return. This document decides *which models produce it and why*.

---

> **Superseded in part, 2026-09-10.** The team decided to run image enhancement
> on the phone and to use Gemini for speech, listing generation and pricing
> reasoning. Sections 3 and 4 below record the research behind the server-side
> options and remain the reference for the fallback path. What was actually
> built is summarised in **Section 1a** and lives on the `feature/ai-integration`
> branch.

## 0. What this document covers

Three of the four services, in the order they run inside the app's create flow:

| # | Service | Port | Job | Covered here |
|---|---|---|---|---|
| 1 | `image-enhancer` | 8001 | Remove background, fix quality, detect attributes | Full |
| 2 | `voice-cataloger` | 8002 | Speech to text, then LLM fills the product details | Full |
| 3 | `pricing-engine` | 8003 | Fair price with reasoning | Section 7 only |
| 4 | `tts-service` | 8004 | Read the listing back aloud | Section 7 only |

Services 3 and 4 are deliberately left thin. They depend on data that does not exist yet, and neither is on the critical path for a working demo.

---

## 1. Decisions at a glance

| Job | Chosen | License | Cost | First fallback |
|---|---|---|---|---|
| Background removal | `rembg` with **BiRefNet-general** | MIT | Free, self-hosted | `birefnet-general-lite` on CPU |
| Background replacement | Pillow alpha compositing | Free | Free | none needed |
| Quality correction | OpenCV, classical only | Apache 2.0 | Free | none needed |
| Blur / exposure gates | OpenCV Laplacian and histogram | Apache 2.0 | Free | none needed |
| Dominant colours | k-means over foreground pixels | Free | Free | none needed |
| Category and pattern guess | CLIP zero-shot | MIT | Free | rule based on edge density |
| Upscale (optional) | Lanczos plus unsharp for MVP | Free | Free | Real-ESRGAN x2 binary |
| Speech to text | **Bhashini ASR** (Government of India) | Free for proof of concept | Free | AI4Bharat IndicConformer 600M, local |
| Translation | Bhashini NMT | Free for proof of concept | Free | IndicTrans2 distilled, local |
| Listing generation | **Gemini Flash**, JSON mode | Free tier | Free to 1,500 calls/day | Sarvam 105B, then local Qwen |
| GI tag resolution | Curated lookup table, not the LLM | Free | Free | none, this must stay deterministic |

Everything on the primary path is either free or free at our volume. Nothing requires a paid commercial licence.

---

## 1a. What is built, and where

| Job | Runs | Code |
|---|---|---|
| Background removal, composite, crop | On the phone | `apps/mobile/services/image/` |
| Quality gates, dominant colours | On the phone | `apps/mobile/services/image/analysis.ts` |
| Speech to text, listing generation | Gemini | `apps/ai-services/voice-cataloger/` |
| Price adjustments and reasoning | Gemini, arithmetic in Python | `apps/ai-services/pricing-engine/` |
| Server-side matte | Not built | Rescue path only, see section 3 |

**On-device libraries.** `@six33/react-native-bg-removal` for the cut-out and
`@shopify/react-native-skia` for compositing and pixel reads. The first one
matters: it uses ML Kit **Subject** Segmentation on Android, which finds general
objects. The more popular `react-native-background-remover` uses **Selfie**
Segmentation, which only finds people and would return an empty matte for a pot
or a dupatta.

**Model.** `gemini-3.6-flash`, set via `GEMINI_MODEL`. Do **not** pin the 2.5
family. It still appears in the model listing, but calling it returns 404 with
"no longer available to new users" on keys issued recently; 3.6 is what Google's
own error message recommends. Verified against a live key.

**Two guardrails are enforced in code, not in prompts.** The Geographical
Indication tag must survive a fuzzy match against a region-filtered shortlist,
and the recommended price is clamped so it can never fall below cost plus a
minimum fair margin. Both are covered by the checks described in section 6.

---

## 2. Constraints these choices have to satisfy

- **The response shape is fixed.** The mobile app already has TypeScript types generated against `packages/shared-types/src/ai-requests.ts`. Field names and nesting are not negotiable.
- **Latency budget.** Image enhancement under 5 seconds, voice to listing under 15 seconds. The artisan is standing there holding the product.
- **Four languages.** Hindi, English, Tamil, Bengali.
- **Must degrade, never crash.** The app is offline-first. Every failure returns a typed error code with plain-language suggestions, because the user may not read English.
- **CPU must be enough.** Assume no GPU on demo day. Any model that only works on a GPU is a liability, not an asset.
- **The listing must be true.** The output goes on a real marketplace under a real artisan's name. A hallucinated Geographical Indication tag or an invented measurement is a legal problem for them, not a cosmetic bug.

---

## 3. Service 1 — Image Enhancer

### 3.1 Background removal

**Use `rembg` with the `birefnet-general` session, and set it explicitly.**

```python
from rembg import remove, new_session

session = new_session("birefnet-general")   # never rely on the default
output = remove(image_bytes, session=session)
```

The explicit model name matters. As of the 2026 releases, `rembg` defaults to **BRIA RMBG-2.0**, which scores higher on benchmarks but ships under a licence requiring a paid agreement for commercial use. A government-facing artisan livelihood product cannot depend on that. BiRefNet weights are MIT and commercial use is allowed.

**Fallback ladder, in order:**

| Order | Model | When |
|---|---|---|
| 1 | `birefnet-general` | Default, GPU or a strong CPU |
| 2 | `birefnet-general-lite` | CPU-only host, roughly the SwinT backbone |
| 3 | `isnet-general-use` | Last resort, older but very fast |

**Rejected and why.** RMBG-2.0 for the licence. Segment Anything because it needs point or box prompts we do not have. Plain U²-Net because BiRefNet supersedes it on fine edges, which matters for textiles, fringes and jewellery chains.

**Performance note.** BiRefNet runs at 1024x1024 by default. Published ONNX timings are around 165 ms on an A100 for the large backbone and 94 ms for the light one. On CPU expect single-digit seconds for the light variant, which is why the ladder exists. Load the session once at FastAPI startup and reuse it. Never construct a session per request.

### 3.2 Background replacement

Straight Pillow work, no model needed.

- **transparent** — return the RGBA PNG as it comes out of the matte.
- **white** — composite onto pure white. Marketplaces including ONDC and Amazon Karigar prefer this.
- **wood / cloth** — composite onto a bundled tiled texture. Ship two or three tasteful textures in `assets/backgrounds/`, do not generate them.

Add a soft elliptical drop shadow under the product before compositing. It is about fifteen lines of Pillow and it is the single biggest perceived-quality jump in the whole service.

### 3.3 Quality correction

Classical image processing only. In order:

1. **White balance** — gray-world assumption. Handbook photos are shot under tungsten bulbs and come out orange.
2. **Lighting** — CLAHE applied to the L channel in LAB colour space. Clip limit around 2.0, tile grid 8x8. Never equalise RGB channels separately, it shifts hue.
3. **Gamma** — nudge toward a target mean luminance.
4. **Saturation** — a modest bump, capped. Over-saturating misrepresents dye colour.
5. **Sharpen** — unsharp mask, radius 2, amount around 1.2.

**Why no generative enhancement model.** A diffusion-based enhancer is non-deterministic and will invent thread patterns, straighten a hand-carved edge, or change a dye shade. The photo is evidence of a physical object a buyer will receive. Classical correction cannot invent detail, which here is a feature. Say this out loud in the pitch, it is a real differentiator.

### 3.4 Quality gates mapped to error codes

Run these **before** the expensive matte, and fail fast.

| Contract error code | Test | Suggested threshold |
|---|---|---|
| `IMAGE_TOO_DARK` | Mean V channel in HSV | below 60 of 255 |
| `IMAGE_TOO_BRIGHT` | Share of pixels at 250+ | above 10 percent |
| `IMAGE_BLURRY` | Variance of Laplacian | below 100 |
| `NO_PRODUCT_DETECTED` | Alpha coverage after matte | below 5 or above 95 percent |
| `FILE_TOO_LARGE` | Byte length | above 10 MB |
| `INVALID_FORMAT` | Pillow open fails | n/a |

Tune every threshold against real artisan photos, not stock images. The suggestions array is user-facing and must be translated, not English-only.

### 3.5 Crop and output

Bounding box from the alpha channel, pad by 8 percent, letterbox to the requested ratio, resize longest edge to 1080. Thumbnail at 320. JPEG quality 85 for the composited versions, PNG only when transparent was requested.

### 3.6 Detected attributes

These feed straight into the voice service, so they are a real dependency, not decoration.

- **`dominant_colors`** — k-means with k=5 over foreground pixels only, in LAB space, sorted by cluster population, returned as hex. Masking out the background first is what makes this useful.
- **`product_category_guess`** — CLIP zero-shot against the eleven values of `CraftCategory` in `packages/shared-types/src/product.ts`. Use `ViT-B/32`, it is small and CPU-friendly. Prompt each class as a sentence, for example "a photograph of handwoven textile fabric", not the bare label.
- **`has_pattern` / `pattern_type`** — CLIP again with a short prompt list covering floral, geometric, paisley, striped, animal motif and plain. Back it up with edge density as a sanity check.

**Why zero-shot rather than a trained classifier.** There is no labelled dataset of Indian handicraft photos, and building one is not a hackathon-scale task. This field is a *hint* that pre-fills a form the artisan can correct. Zero-shot accuracy is enough for a hint, and it costs nothing to build.

### 3.7 Upscaling

Leave `upscale` off by default. At 1080 px on a 6-inch phone screen it changes nothing a judge or buyer will notice.

If you do implement it, avoid `pip install realesrgan`. It pulls `basicsr`, which is unmaintained and breaks against current torchvision. Use the pre-built `realesrgan-ncnn-vulkan` binary or an exported ONNX model instead. For the MVP, Lanczos resize followed by unsharp mask is honest and instant.

### 3.8 Dependencies to add

The existing `image-enhancer/requirements.txt` is close. Add:

```
scikit-learn>=1.6.0        # k-means for dominant colours
numpy>=2.0.0
open_clip_torch>=2.30.0    # zero-shot category and pattern
torch>=2.5.0               # CPU wheel is fine
```

Pin `rembg` to a version you have actually tested. Its model defaults have changed between releases and that change carries a licence consequence.

---

## 4. Service 2 — Voice Cataloger

This is the heart of the product. An artisan speaks for twenty seconds in Bhojpuri-accented Hindi and gets a marketplace-ready bilingual listing.

### 4.1 Speech to text

**Primary: Bhashini ASR.** It is the Government of India's language infrastructure under MeitY, it is free at proof-of-concept volume, and it covers all four target languages. For Smart India Hackathon specifically, building on national digital public infrastructure is worth genuine credit with judges.

**Register at** `bhashini.gov.in/ulca`, take the UserID and API key from the dashboard, then call the Config API to get pipeline and service IDs. Do not hardcode a service ID from a blog post, they rotate. The contract names `ai4bharat/conformer-multilingual-indo_aryan-gpu--t4` as a starting point.

**Fallback ladder:**

| Order | Model | Notes |
|---|---|---|
| 1 | Bhashini ASR API | Free, hosted, no local compute |
| 2 | `ai4bharat/indic-conformer-600m-multilingual` | MIT, 22 languages, hybrid CTC and RNNT, runs local |
| 3 | `faster-whisper` large-v3-turbo | Best for English and code-mixed speech |
| 4 | Sarvam Saaras v3 | Paid at about ₹30 per hour, ₹100 free credits on signup |

The local AI4Bharat model loads through `transformers` with `trust_remote_code=True` and exposes both decoders:

```python
from transformers import AutoModel
model = AutoModel.from_pretrained(
    "ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True
)
text = model(wav_16k, "hi", "ctc")    # or "rnnt" for higher accuracy, slower
```

**On accuracy.** Published IndicVoices word error rates put Sarvam Saaras v3 near 19 percent and Saarika v2.5 near 22 percent across Indian languages. Whisper sits materially worse on Hindi, around 27 percent on difficult audio, because Hindi is a second-tier language in its training mix. The practical reading is that an India-specific model beats a general multilingual one on exactly our users, so treat Whisper as the English and code-mixed path rather than the default.

**On the `confidence` field.** The contract requires one. Bhashini does not reliably return it. Derive it from the CTC log probability when you run locally, and when you cannot, return a calibrated estimate from audio signal-to-noise ratio and duration. Do not hardcode `0.92`. The review screen may eventually use this number to decide how hard to nudge the artisan to check the text.

### 4.2 Audio preprocessing

Do this before anything reaches a model. It is cheap and it removes most failure modes.

- Transcode to 16 kHz mono PCM WAV with `ffmpeg`. Phone recordings arrive as M4A at 44.1 kHz.
- Trim leading and trailing silence, normalise loudness.
- Reject under 3 seconds as `AUDIO_TOO_SHORT`, over 5 minutes as `AUDIO_TOO_LONG`.
- Estimate signal-to-noise ratio, and below a threshold return `AUDIO_TOO_NOISY` with a suggestion to move away from the loom or the street.

### 4.3 Translation

Bhashini NMT is the primary, with IndicTrans2 distilled as the MIT-licensed local fallback.

**A simplification worth taking.** For Hindi, Tamil and Bengali, a capable LLM already produces good English and can emit both languages in one pass. Running a separate translation hop adds latency and a second failure point. Recommendation: send the original transcript straight to the LLM and ask for every language in one structured response. Keep the translation service wired up only for the offline path where the local LLM is weaker in Indic scripts.

### 4.4 The listing LLM

This is the "understand the need and fill in the details" piece.

**Primary: Gemini Flash on the free tier.** Roughly 15 requests per minute and 1,500 per day, with native JSON mode and function calling included. That is far beyond hackathon demand. Note that free-tier prompts may be used to improve Google's products, so a production launch would need a paid tier or a different model. Flag that to Swarup rather than discovering it at deployment.

**Indian alternative: Sarvam.** Their chat model is trained for Indian languages and every new account gets ₹100 in credits. Listed rates are about ₹29 per million input tokens and ₹73 per million output tokens, so ₹100 covers a very large number of listings. If the pitch benefits from an all-Indian stack, this is the swap to make, and it is a one-line change behind a provider interface.

**Offline demo fallback:** a quantised Qwen or Llama through Ollama. Worth having if the venue Wi-Fi fails.

Build the LLM call behind a small provider interface from day one. You will switch providers at least once.

**Non-negotiable implementation rules:**

1. **Structured output, always.** Use the provider's JSON schema mode. Never parse prose.
2. **Validate with Pydantic**, and on failure re-prompt once with the validation error attached. Fail to a typed `LLM_FAILED` after that.
3. **Inject the image attributes.** The category guess and dominant colours from service 1 go into the prompt. This is the whole reason the two services share a contract.
4. **Never invent.** If the artisan did not say a dimension, a material or a region, the field is `null`. Put this in the system prompt as a hard rule and give a worked example of leaving a field empty. This is the most important line in the prompt.
5. **SEO shape.** Title should carry material, technique and region, because that is how Indian marketplace search actually works. Four to six bullet features. Keep the heritage story short and specific.

### 4.5 Geographical Indication tags

**Do not let the LLM produce a GI tag freely.** A GI tag is a legal certification. Claiming "Banaras Brocades and Sarees" for a product that does not qualify is a false claim made in the artisan's name.

Instead, ship a curated JSON of GI tags with craft type and region. Filter it by the artisan's stated region, pass only the shortlist into the prompt, and have the model select one or return null. Fuzzy-match the output back against the table before it leaves the service. Roughly 400 entries covers Indian handicrafts and the list is published by the GI Registry.

### 4.6 Dependencies to add

```
google-genai>=1.0.0       # or the openai client pointed at Sarvam
librosa>=0.10.0           # resample, silence trim, SNR
soundfile>=0.13.0
pydantic>=2.10.0          # already present, used for schema validation
rapidfuzz>=3.10.0         # GI tag matching
```

`ffmpeg` must be present on the host. Add it to the Dockerfile, it is not a pip package.

---

## 5. Where these actually run

The gateway edge function reads `AI_SERVER_URL` and forwards to it, so the services need a reachable address.

| Option | Good for | Watch out for |
|---|---|---|
| Laptop plus a Cloudflare tunnel | Demo day, zero cost, full control | Your laptop must stay awake and online |
| Colab T4 plus a tunnel | Anything needing a GPU | Sessions die after a few hours |
| Hugging Face Spaces | Always-on, free CPU tier | Cold starts, 16 GB RAM ceiling |
| Render or Railway | Closest to production | Free tiers sleep, cold start hurts |

**Recommendation: make the CPU path the real path.** Keep speech recognition and the LLM on hosted APIs (Bhashini, Gemini) so the heavy compute never touches your machine, and keep only the light BiRefNet variant local. That combination runs acceptably on a laptop and does not care whether the venue has a GPU.

Load every model once in a FastAPI `lifespan` startup hook. A cold model load inside the first request will blow the latency budget and it will happen during the demo.

---

## 6. Build order

**Phase 0 — stubs first, same day.** Stand up all four FastAPI services returning hardcoded responses in the exact contract shape. Swarup's app currently renders mock data behind TODOs in the review and pricing screens. Contract-shaped stubs let him delete those and wire real network calls immediately, while you build the real thing behind an unchanged interface. This is the highest-value hour in the whole project.

**Phase 1 — image enhancer, real.** Matte, composite, correct, crop, gates, attributes. Fully local, no external API keys needed, so nothing blocks you.

**Phase 2 — speech to text.** Bhashini registration first, because approval is not instant. Build against the local AI4Bharat model while you wait.

**Phase 3 — listing generation.** Prompt, schema, validation, GI table.

**Phase 4 — hardening.** Timeouts matching the client, `X-API-Key` check on every route, structured logging with `job_id`, Supabase upload of outputs, real `processing_time_ms`.

---

## 7. The two services this document does not decide

**Pricing engine.** The contract already specifies the honest version: a deterministic floor price the app computes locally, market comparables from the `price_references` table, then an adjustment layer. That table is currently empty, and no model can be chosen sensibly until it has data. Start by seeding roughly 200 real observations by hand. With that in place, a gradient-boosted model over a handful of features is enough, and it keeps the reasoning explainable, which the contract demands. Do not reach for an LLM to produce prices.

**Text to speech.** Bhashini TTS on the free tier, or AI4Bharat's Indic TTS models locally. Low risk, low effort, build it last.

---

## 8. Open questions for Swarup

1. **Bhashini's free tier is proof-of-concept only.** Production or revenue-generating use needs a paid agreement. Fine for the hackathon, needs an answer in the pitch when a judge asks about scale.
2. **Who owns the Gemini or Sarvam key, and what is the spend ceiling?** Free tiers cover the demo but not a pilot.
3. **The Supabase service role key.** Services 1 and 2 cannot upload their outputs without it. It is mentioned in the onboarding doc as "I'll share it with you" and has not been shared.
4. **Storage bucket names contradict each other.** `apps/ai-services/README.md` says to upload to a bucket called `product-media`. Migration 004 and the onboarding doc both say `enhanced-images` and `voice-recordings`. The migration is what actually exists, so the service README is wrong and should be corrected.
5. **What does `confidence` drive in the UI?** If the review screen will use it to prompt the artisan to re-record, it needs to be calibrated rather than decorative.

---

## 9. Sources

- [rembg](https://github.com/danielgatis/rembg) — model list, sessions, install extras, and the BRIA licence note
- [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) and [BiRefNet on Hugging Face](https://huggingface.co/ZhengPeng7/BiRefNet) — MIT weights, ONNX timings
- [BiRefNet_lite ONNX](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX) — lightweight CPU variant
- [briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0) — the licence we are avoiding
- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) — BSD, and the basicsr install problem
- [AI4Bharat IndicConformer 600M multilingual](https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual) — MIT, 22 languages, CTC and RNNT
- [AI4Bharat IndicConformerASR](https://github.com/AI4Bharat/IndicConformerASR) — training and inference code
- [IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) — MIT translation models and distilled variants
- [Bhashini API documentation](https://bhashini.gitbook.io/bhashini-apis) — pipeline config, ASR, NMT, TTS calls
- [Bhashini available models](https://dibd-bhashini.gitbook.io/bhashini-apis/available-models-for-usage) — service IDs
- [Sarvam pricing](https://docs.sarvam.ai/api-reference-docs/pricing) and [rate limits](https://docs.sarvam.ai/api-reference-docs/ratelimits) — ₹100 signup credits, per-hour speech rates
- [Saaras v3 announcement](https://www.sarvam.ai/blogs/asr) — IndicVoices word error rates
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) and [whisper-large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo) — CPU speed, decoder pruning
- [Gemini API free tier limits](https://tokenmix.ai/blog/gemini-api-free-tier-limits) — requests per minute and per day, JSON mode
