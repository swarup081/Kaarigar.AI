# On-Device Image Enhancement

Runs the whole image pipeline on the phone: quality gates, background removal,
compositing onto a marketplace backdrop, ratio crop, and colour measurement.
No network, so it works in a workshop with no signal.

```ts
import { enhanceProductPhoto } from '@/services/image';

const result = await enhanceProductPhoto(photoUri, 'enhanced');
if (result.status === 'completed') {
  console.log(result.enhanced.uri, result.attributes.dominantColors);
}
```

## Pipeline

```
photo ─> gates ─> cut out subject ─> composite ─> measure ─> save
          │            │
          │            └─ ML Kit Subject Segmentation (Android)
          │               Vision framework (iOS 17+)
          └─ too dark / too bright / blurry, with typed error codes
```

## Files

| File | Job |
|---|---|
| `enhance.ts` | Orchestrates the pipeline. The only entry point most callers need |
| `analysis.ts` | Pure pixel maths: exposure, sharpness, coverage, k-means colours |
| `canvas.ts` | Skia work: decode, downscale, colour correction, composite, encode |
| `backgroundRemoval.ts` | Wraps the native cut-out, handles unsupported devices |
| `thresholds.ts` | Every tunable number, in one place |
| `types.ts` | Result and option types |

`analysis.ts` has no native imports, so its functions can be unit tested on
plain arrays without a device.

## Native dependencies

- **`@six33/react-native-bg-removal`** — the cut-out. On Android this is ML Kit
  **Subject** Segmentation, which finds general objects. Do not swap it for
  `react-native-background-remover`, which uses **Selfie** Segmentation and
  finds only people: it returns an empty matte for a pot or a dupatta.
- **`@shopify/react-native-skia`** — compositing and pixel reads, offscreen, so
  no `<Canvas>` needs to be mounted.

Both are native modules, so this needs a development build. The app already
required one before this change, because `react-native-share` does not run in
Expo Go either.

Background removal needs a **real device**. iOS simulators hand back the
original file, which the wrapper detects and reports as unsupported.

## Device support

| Platform | Requirement | Below that |
|---|---|---|
| Android | API 24, Play Services | Falls back, marks `serverFallbackSuggested` |
| iOS | 17.0, physical device | Same |

When the cut-out is unavailable the photo is still corrected, cropped and
saved. It is just not cut out. `serverFallbackSuggested` tells the caller it is
worth retrying through the server matte if a connection turns up.

## Quality gates

Failures come back as typed codes with i18n keys, never raw English:

`IMAGE_TOO_DARK` · `IMAGE_TOO_BRIGHT` · `IMAGE_BLURRY` ·
`NO_PRODUCT_DETECTED` · `FILE_TOO_LARGE` · `INVALID_FORMAT` ·
`PROCESSING_ERROR`

These are the same codes the server contract defines, so both paths behave
alike from the app's point of view.

**Translation keys still need writing.** `enhance.ts` emits
`camera.errors.<CODE>` and `camera.tips.<name>`; none of them exist yet in
`services/i18n/*.json`.

## Why classical correction, not a generative enhancer

A diffusion enhancer will invent thread patterns, straighten a hand-carved
edge, or shift a dye colour. The photo is evidence of a physical object a buyer
will receive. Classical correction cannot invent detail, and here that is a
feature rather than a limitation.

## Tuning

Every threshold lives in `thresholds.ts`. The current values are reasoned
starting points, not measured ones. Tune them against real artisan photos shot
on low-end phones in workshop lighting, not against stock images.
