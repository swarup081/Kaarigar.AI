# Standalone Kaarigar for Android

Kaarigar can generate bilingual listings and pricing with only the installed app,
an internet connection, and a Gemini API key entered on the phone. A laptop,
Metro, Expo Go, Python, Docker and the local API gateway are not needed at runtime.

## First use

1. Install `artifacts/Kaarigar-standalone.apk` on an Android phone.
2. Open **Profile → API & environment** (the settings icon opens the same screen).
3. Select **Standalone · Gemini** and enter your own Gemini API key.
4. Keep the configured model or enter a model available to your account.
5. Tap **Test Gemini connection**, then **Save environment**. The test sends one small request.
6. Photograph your product, record a description, review the generated listing,
   enter your costs, and save it to your catalog.

Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey).
API usage uses that key's account and quota. The APK contains no Gemini key.
Saved credentials use Expo SecureStore / Android Keystore and are not included
in Android backups. Clearing the key and saving removes it from the settings.
Uninstalling the app also removes its local data on Android.

Settings apply to the next request without restarting or rebuilding. An in-flight
request continues with its original settings. Both connection modes retain their
fields, so switching modes does not erase the other connection's settings.

## What moved into the app

| Feature | Runs where |
| --- | --- |
| Camera, image analysis, enhancement and background removal | Phone; existing native image pipeline |
| Recording and playback | Phone |
| Audio/image preparation, listing prompt, schema, validation and GI filtering | Phone |
| Speech understanding, translation and listing text generation | Google Gemini, called directly over HTTPS |
| Cost floor, hourly craft rates, overhead, fair margin and price limits | Phone |
| Optional pricing explanation and estimates | Google Gemini, called directly over HTTPS |
| Product catalog and pending uploads | Phone SQLite |
| Optional cloud data/storage | Supabase, configured separately |

`services/api/ai.ts` remains the interface used by the screens. Standalone mode
dispatches to `directAI.ts`; hosted mode retains the gateway request contract.
`localPricing.ts` shares the existing craft rates and margin bands. Recommendations
are rounded upward so rounding cannot put the result below the calculated minimum.

Voice calls send the recording and optional selected product photo to Google.
No audio is sent simply by recording. Direct calls allow audio up to 9 MB and
images up to 4 MB, bounding base64 memory use and request size on smaller phones.
The current app captures voice notes of 3–300 seconds.

Generated listings are validated before use, low-confidence transcripts are rejected,
and an unknown GI tag is removed. The bundled GI seed is copied from the Python
service; direct mode only offers tags matching the supplied region and category.
Unknown regions never receive a generic certification shortlist.

If the key is missing, the network is down, or pricing advice is unavailable,
pricing can still calculate a cost-based minimum. The screen labels this fallback.
Invalid keys/models produce an actionable settings error. AI comparables remain
labeled `ai_estimate`, with zero real market samples.

## Optional hosted API and Supabase

Choose **Hosted API** to call a deployed HTTPS gateway instead. Enter its base URL
and optional bearer token. It must expose `/voice-to-listing` and `/suggest-price`
relative to that URL; a directly deployed FastAPI service may need an `/api` suffix.
The provider key then stays on that gateway. The old Python services remain
available for this deployment option but are not dependencies of standalone mode.

Supabase accepts a public anon/publishable key, never a service-role/secret key.
Changing the Supabase destination does not redirect already-bound pending uploads.
Local-only uploads bind to the first configured destination when sync starts.
One sync run uses one client/destination, even if settings change during upload.

Existing project limitations remain: Firebase phone authentication and actual
ONDC/Amazon/Flipkart channel publishing are unfinished. Saving/publishing currently
records products and channel intent locally. Supabase credentials alone do not
complete authentication, RLS setup, artisan provisioning, or marketplace integration.
Text-to-speech and server-side image rescue are also not implemented.

## Build on Windows

Prerequisites: the repository's Node/pnpm dependencies, JDK 17, Android SDK/NDK,
and CMake 4.1.2 (the existing plugin pins this version for Windows path support).
The plugin pins the toolchain for all native dependency projects as well as the app;
otherwise release builds can select the old Ninja and loop while regenerating CMake.

```powershell
pnpm install
pnpm --filter @kaarigar/mobile typecheck
pnpm --filter @kaarigar/mobile test:standalone
pnpm --filter @kaarigar/mobile build:standalone
```

The build script ignores `.env` and inherited `EXPO_PUBLIC_*` variables and makes
a **release** APK with a bundled Hermes app. Default native architectures are
ARM64 and ARMv7 for physical Android phones. The output is
`artifacts/Kaarigar-standalone.apk`, with an adjacent SHA-256 checksum.

The generated Expo Android configuration uses its development signing certificate
for this installable internal release. Store distribution requires your own managed
production signing credentials; the EAS production profile produces an AAB.
The preview profile produces a standalone APK; it does not require a development client.

After native configuration is already generated, an incremental build can use:

```powershell
./scripts/build-standalone.ps1 -SkipPrebuild
```

## Verification

Automated tests exercise the real TypeScript services with native file/storage
boundaries substituted for Node: persistence, environment changes, public key
validation, pricing bounds, GI filtering, malformed model output, provider errors,
cancellation, timeout, and offline fallback.

`tests/live-smoke.cjs` optionally exercises the real Gemini API using an existing
local service key and a supplied synthetic WAV recording. It checks English/Hindi
listing generation and non-degraded pricing without printing credentials.

Device acceptance: install the release APK, switch off the laptop, configure/test
Gemini on mobile data, generate a listing, force-close/reopen and check saved settings,
then use airplane mode to check local catalog access and cost-based pricing.
Camera segmentation requires a compatible physical phone; it cannot be established
by the service tests alone.

Implementation references: [Gemini REST generation](https://ai.google.dev/api/generate-content)
and [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
