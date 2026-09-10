# AI Integration Guide

How images, audio and the language model fit together, and how to run the whole
thing on your own machine.

**Audience:** anyone wiring the create flow. If you only want to know which
models were chosen and why, read `apps/ai-services/AI_REQUIREMENTS.md` instead.

---

## 1. What runs where

```
   ┌─────────────────────── phone, offline capable ───────────────────────┐
   │                                                                      │
   │  camera ──> quality gates ──> cut out subject ──> composite ──> save │
   │                                   (ML Kit / Vision)                  │
   └──────────────────────────────────┬───────────────────────────────────┘
                                      │  enhanced photo + voice recording
                                      ▼
                       Supabase Edge Function (ai-gateway)
                                      │
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
      voice-cataloger :8002                        pricing-engine :8003
      audio + photo ──> Gemini                     costs ──> Python floor
      ──> transcript + listing JSON                      ──> Gemini adjustments
                                                         ──> clamped price
```

Three deliberate choices are worth knowing before you read the code.

- **Images never leave the phone.** Background removal runs natively, so the
  camera step works with no signal at all. The server image endpoint exists only
  as a rescue path for devices that cannot do it, and it is not built yet.
- **One model call does speech and writing together.** No separate speech-to-text
  service, no separate translation hop. Gemini hears the artisan and sees the
  product in the same request, which is why the listing knows the dupatta is red
  and gold even when nobody said so.
- **The model never names a price.** It returns percentages and reasons. The
  arithmetic is Python, and the result is clamped so it cannot fall below cost
  plus a fair margin.

---

## 2. Run the services

Both services are independent. Each gets its own virtualenv.

```bash
cd apps/ai-services/voice-cataloger
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in that directory (it is gitignored):

```bash
GEMINI_API_KEY=your_key           # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.6-flash
SHARED_API_KEY=pick_any_secret
```

Then:

```bash
uvicorn main:app --port 8002 --reload      # voice-cataloger
uvicorn main:app --port 8003 --reload      # pricing-engine, in its own venv
```

Check they are alive:

```bash
curl http://localhost:8002/health
curl http://localhost:8003/health
```

Both report whether a Gemini key is configured.

### About the model name

**Do not pin `gemini-2.5-flash`.** It still appears in the model listing, but
calling it returns 404 with "no longer available to new users" on keys issued
recently. `gemini-3.6-flash` is the current default and is what Google's own
error message recommends. Change it in one place, `GEMINI_MODEL`.

### Prove it works

```bash
GEMINI_API_KEY=your_key python apps/ai-services/smoke_test.py
```

Fifteen checks. It synthesises its own Hindi test speech through Gemini's
text-to-speech, so there are no audio fixtures in the repo. It verifies the two
guardrails that would actually hurt someone if they broke: that a hallucinated
Geographical Indication tag is dropped, and that a below-cost price is clamped.

---

## 2b. Run the dev gateway

The app talks to one URL. The services listen on separate ports. In production
the Supabase Edge Function does that routing; locally, `dev_gateway.py` stands
in for it so you do not need Deno and the Supabase CLI just to try the app.

```bash
python apps/ai-services/dev_gateway.py
```

It prints the address your phone should use and `GET /health` reports which
services are actually up, so a failure is easy to place:

```json
{"gateway":"ok","reachable_at":"http://192.168.0.246:8000",
 "services":{"/voice-to-listing":"up","/suggest-price":"up",
             "/enhance-image":"down","/text-to-speech":"down"}}
```

`enhance-image` and `text-to-speech` showing "down" is expected. Neither is
built, and neither is on the path the app uses.

Point the app at the printed address in `apps/mobile/.env`:

```bash
EXPO_PUBLIC_AI_GATEWAY_URL=http://192.168.0.246:8000
```

**Not `localhost`.** On a phone, localhost is the phone. Use the machine's
address on your Wi-Fi, and keep both devices on the same network.

---

## 3. Run the app

**A development build is required.** Expo Go will not work, because the image
pipeline uses native modules. This is not a new cost: `react-native-share` and
`react-native-view-shot` were already outside Expo Go before this change.

```bash
pnpm install
cd apps/mobile
npx expo prebuild
npx expo run:android      # or run:ios
```

Background removal needs a **real device**. iOS simulators return the original
file unchanged, which the wrapper detects and reports as unsupported.

| Platform | Minimum | Below that |
|---|---|---|
| Android | API 24 with Play Services | Photo is still corrected and cropped, just not cut out |
| iOS | 17.0, physical device | Same |

---

## 4. Images

Code lives in `apps/mobile/services/image/`. Full detail in the README there.

```ts
import { enhanceProductPhoto } from '@/services/image';

const result = await enhanceProductPhoto(photoUri, 'enhanced');

if (result.status === 'completed') {
  result.enhanced.uri;            // composited, corrected, cropped
  result.enhanced.thumbnailUri;   // 320px version for lists
  result.attributes.dominantColors;  // ['#B8860B', '#8B0000', ...]
  result.backgroundRemoved;       // false if the device could not cut out
  result.serverFallbackSuggested; // true if a server matte would be better
} else {
  result.error.code;              // IMAGE_TOO_DARK, IMAGE_BLURRY, ...
  result.error.messageKey;        // pass to t()
  result.error.suggestionKeys;    // pass each to t()
}
```

Already wired into `app/create/camera.tsx`. Enhancement fires in the background
after each shot, so the artisan repositions for the next angle instead of
watching a spinner. Results land in `stores/imageStore.ts`.

### Reading the results

```ts
import { usePhotoStore } from '@/stores/imageStore';

const photos = usePhotoStore((s) => s.photos);              // per-photo status
const uris = usePhotoStore((s) => s.getPublishableUris());  // falls back to originals
const attrs = usePhotoStore((s) => s.getMergedAttributes()); // colours across all shots
```

`getPublishableUris()` never returns an empty slot. Where enhancement failed it
gives you the original frame, because a plain photo beats no photo.

### Errors are translated, not raw

Failures return i18n keys, never English strings. All of them exist in
`services/i18n/{en,hi,ta,bn}.json` under `camera.errors` and `camera.tips`.

```tsx
<Text>{t(result.error.messageKey)}</Text>
{result.error.suggestionKeys.map((k) => <Text key={k}>{t(k)}</Text>)}
```

### Tuning

Every threshold sits in `services/image/thresholds.ts`. The current numbers are
reasoned starting points, not measured ones. Tune them against real artisan
photos on low-end phones in workshop light, not against stock images.

---

## 5. Audio and the listing

`POST /api/voice-to-listing` on port 8002.

Send the recording and, when you have it, the enhanced photo. The photo is
optional but it measurably improves the category and colour fields.

```ts
const form = new FormData();
form.append('audio', { uri: voiceUri, name: 'voice.m4a', type: 'audio/m4a' } as any);
form.append('source_language', 'hi');
form.append('target_languages', JSON.stringify(['hi', 'en']));
form.append('region', artisan.region);          // drives the GI tag shortlist
form.append('product_category', 'textile');     // a hint, the model may correct it
form.append('detected_attributes', JSON.stringify({ dominantColors: attrs.dominantColors }));
form.append('image', { uri: enhancedUri, name: 'product.jpg', type: 'image/jpeg' } as any);
```

No transcoding needed. Gemini accepts the m4a that `expo-audio` produces.

**Send `region`.** It is what filters the Geographical Indication shortlist. With
no region the model gets a generic list and will almost always return null,
which loses a genuine selling point for artisans who qualify.

### What comes back

```jsonc
{
  "jobId": "...",
  "status": "completed",
  "results": {
    "transcription": { "originalText": "...", "languageDetected": "hi", "confidence": 0.9 },
    "listing": {
      "title":          { "hi": "...", "en": "..." },
      "description":    { "hi": "...", "en": "..." },
      "bulletFeatures": { "hi": ["..."], "en": ["..."] },
      "heritageStory":  { "hi": "...", "en": "..." },
      "extractedAttributes": { "material": "silk", "giTag": "...", "colors": ["red","gold"] }
    }
  },
  "processingTimeMs": 19533
}
```

Empty fields are stripped rather than sent as null, so never assume a language
key exists. Expect roughly 15 to 20 seconds end to end.

### Two behaviours that are deliberate

**Fields go missing on purpose.** If the artisan did not say a measurement, a
material or a region, that field is absent. In testing, a recording that said
only "this is a clay pot, I made it, it keeps water cool" produced exactly two
bullets and left material, technique, region and GI tag empty. That is correct.
The listing goes on a marketplace under a real person's name.

**A GI tag can only come from the shortlist.** The model picks from a
region-filtered list and the answer is fuzzy-matched back against that same list
before it leaves the service. Anything outside it is dropped, not corrected. A
GI tag is a legal certification, and a false one is a claim made in the
artisan's name.

### Errors

`AUDIO_TOO_SHORT` under three seconds · `AUDIO_TOO_LONG` over five minutes ·
`AUDIO_TOO_NOISY` the model could not make it out ·
`LANGUAGE_NOT_SUPPORTED` · `LLM_FAILED` · `PROCESSING_ERROR`

Length checks need `ffprobe` on the host. Without it the gate is skipped rather
than failing the request, so the service still runs in a bare container.

---

## 6. Pricing

`POST /api/suggest-price` on port 8003, plain JSON. Send it exactly the
camelCase object the shared types define; `services/api/ai.ts` already does.

Three steps, and only the middle one uses a model:

1. **Floor, in Python.** `materials + (hours × rate) + overhead`, then a minimum
   fair margin on top. Rates mirror `packages/shared-types/src/pricing.ts`.
   **Change a rate in one place and you must change it in the other.**
2. **Adjustments, from Gemini.** Percentages with reasons, never rupee figures.
3. **Final number, in Python**, clamped to the floor plus minimum margin.

Missing both `rawMaterialCost` and `laborHours` returns `INSUFFICIENT_COST_DATA`
rather than a guessed price.

`reasoning.degraded` is `true` when Gemini was unreachable and you are looking at
the floor price alone. The screen should say so rather than presenting it as a
market-informed number.

`marketComparables[].source` is currently `"ai_estimate"` and `sampleSize` is
`0`, because the `price_references` table is empty. Do not render these as
market data until that table is seeded.

---

## 7. What is wired, and what is not

The create flow is connected end to end. Capture, record, generate, price,
publish, and the listing lands in SQLite with its uploads queued.

| Piece | State |
|---|---|
| Camera to enhanced photo | Wired, runs in the background between shots |
| Voice recording | Wired, real `expo-audio` capture with playback |
| Listing generation | Wired, calls the service on arrival at review |
| Editing the listing | Wired, artisan corrections override the model |
| Cost entry and pricing | Wired, asks for materials and hours first |
| Publish to SQLite and outbox | Wired |
| Media and product upload | Wired, queued and drained when online |
| Error and tip translations | Wired, all four languages |
| Server-side image matte | Not built, rescue path only |
| Text to speech readback | Not built |
| Real channel delivery | Not built, publishing records intent locally |

### Still needed from the backend

1. **The Supabase service role key.** The outbox queues uploads correctly, but
   they cannot land without it.
2. **A seeded `price_references` table.** Until then comparables are model
   estimates, labelled as such, and `sampleSize` stays 0.

### Free-tier quota is real

Gemini's free tier allows roughly 1,500 requests a day. Listing generation and
pricing are one call each, so a full run through the create flow costs two. That
is plenty for development, but a demo day with many devices hitting one key will
exhaust it. When it does, pricing degrades to the floor price and says so, and
listing generation returns `LLM_FAILED` with a retry button.

## 8. Two contract corrections

Both are in `docs/api-contracts/` and should be fixed there.

**Response casing.** The contracts show snake_case responses. The app casts
responses straight onto the camelCase TypeScript types in
`packages/shared-types`, so a snake_case response would silently make every
field `undefined`. Both services emit camelCase and accept either casing in.

**The pricing example does not follow its own formula.** It states
`floor = materials + labour + overhead` but lists a floor of 800 while its
components sum to 880. The formula is what is implemented.

---

## 9. Troubleshooting

| Symptom | Cause |
|---|---|
| 404 "no longer available to new users" | `GEMINI_MODEL` is pinned to the 2.5 family. Use `gemini-3.6-flash` |
| Cut-out returns the original image | iOS simulator. Use a real device |
| `backgroundRemoved` always false | Module not linked. Rerun `expo prebuild` |
| Every photo fails a gate | Thresholds are untuned for your test photos. See `thresholds.ts` |
| 401 from a service | `X-API-Key` missing or not matching `SHARED_API_KEY` |
| Listing fields are empty | Usually correct. The artisan did not say those facts |
| `giTag` always null | You are not sending `region` |
| Prices look conservative | The adjustment stack is capped. Tune once you have real listings |

For local curl testing only, `ALLOW_UNAUTHENTICATED=1` skips the shared-secret
check. Never set it on a deployed service.
