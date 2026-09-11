> **Standalone app:** The current app calls Gemini directly and no longer requires the laptop services described below. See [Standalone setup and build](STANDALONE_APP.md). The rest of this document describes the optional legacy gateway workflow.

# Running Kaarigar on a real phone

Everything here was done end to end on a Motorola Edge 60 Pro running Android 16,
against the services on a Windows laptop. Every problem listed under
[Troubleshooting](#troubleshooting) is one that actually happened, not one that
might.

A real device is required. Background removal does not work on an emulator.

---

## 1. What has to be running

Three terminals on the laptop, all left open.

```bash
cd apps/ai-services/voice-cataloger && uvicorn main:app --port 8002
```

```bash
cd apps/ai-services/pricing-engine && uvicorn main:app --port 8003
```

```bash
python apps/ai-services/dev_gateway.py
```

Each service needs a `.env` beside it holding `GEMINI_API_KEY`. The gateway
prints the address the phone should use and serves a plain status page at that
address, which is the quickest way to tell whether the phone can see the laptop
at all.

`enhance-image` and `text-to-speech` showing as down is correct. Neither is
built, and the app does not call them.

---

## 2. Point the app at the laptop

`apps/mobile/.env`:

```bash
EXPO_PUBLIC_AI_GATEWAY_URL=http://192.168.31.217:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Use the address the gateway printed, **never `localhost`**. On a phone,
localhost is the phone. Your laptop's address changes between networks, so
expect to update this line.

**Only the anon key belongs here.** Anything prefixed `EXPO_PUBLIC_` is compiled
into the JavaScript bundle and can be read straight out of the APK. The Supabase
service role key bypasses row-level security, so putting it in the app would
hand every user full access to the database. It belongs on a server, nowhere
else. The Gemini key never goes in the app either; the app only knows the
gateway address.

---

## 3. Build and install

```bash
pnpm install
cd apps/mobile
npx expo prebuild --platform android
npx expo run:android
```

Expo Go will not work, because the image pipeline uses native modules. Plug the
phone in with USB debugging enabled and accept the prompt on the device. The
first build takes ten to twenty minutes; later ones are quick.

Check the phone is visible first:

```bash
adb devices
```

`unauthorized` means the prompt on the phone has not been accepted. Nothing
listed usually means a charge-only cable, which looks identical to a data one.

### Prove the phone can reach the laptop

Open the gateway address in the **phone's** browser before launching the app. If
that page loads, the app will reach the services too.

`ping` failing proves nothing. Windows blocks ICMP by default while still
accepting TCP, so the ping test misleads. Trust the browser.

---

## 4. Walking the flow

Photograph a product on a plain background, then speak for at least five seconds
describing what it is made of, how it was made, and its size. Review shows your
words back, then a bilingual listing about twenty seconds later. Enter a material
cost and hours to get a price, choose channels, and publish.

Worth testing beyond the happy path:

- **Say almost nothing.** "This is a clay pot." You should get two bullets and no
  invented size, material or origin.
- **Turn off Wi-Fi before publishing.** It still saves, and says how many items
  are waiting to upload.
- **Drag the price below cost.** A warning appears.

---

## 5. Inspecting what was saved

The local database is the source of truth for anything published. On a debug
build you can read it directly:

```bash
adb exec-out "run-as com.kaarigar.app cat files/SQLite/kaarigar.db" > kaarigar.db
adb exec-out "run-as com.kaarigar.app cat files/SQLite/kaarigar.db-wal" > kaarigar.db-wal
```

**Copy the `-wal` file too.** SQLite runs in write-ahead mode, so recent writes
live there and the main file alone looks empty. Use `exec-out`, not `shell`:
`adb shell` translates newlines and corrupts binary files, which shows up as
"no such table".

Enhanced photos sit in `files/enhanced/`, originals in `files/`.

---

## Troubleshooting

Every row below is a failure that occurred during the first real device run.

| Symptom | Cause and fix |
|---|---|
| `ninja: Filename longer than 260 characters` | pnpm nests packages under `.pnpm/<name>@<version>_<hash>/`, adding ~140 characters to every path. The root `.npmrc` sets `node-linker=hoisted` to flatten it. Delete `node_modules` and reinstall if you hit this. |
| `ninja: error: Stat(...cpp.o)` on gesture-handler | Gradle picks the oldest installed CMake, 3.22.1, whose ninja predates long-path support. `plugins/withCmakeVersion.js` pins 4.1.2, which ships ninja 1.12.1. Install it with `sdkmanager "cmake;4.1.2"`. Moving the project to a shorter folder does **not** help: the fixed part of that path already exceeds 300 characters. |
| `Manifest merger failed : ... mlkit.vision.DEPENDENCIES` | The background-removal library wants the `subject_segment` model, expo-camera wants `barcode_ui`, and both declare the same key. `plugins/withMlKitDependencies.js` merges them. Dropping either is wrong: without `subject_segment` the cut-out silently returns the original photo. |
| `Configuring project without an existing directory` | The `android/` folder was generated before a dependency layout change, so autolinking points at paths that no longer exist. Re-run `expo prebuild`. |
| `EBUSY: resource busy or locked` during prebuild | A Gradle daemon or OneDrive still holds the folder. Run `./gradlew --stop`, or prebuild without `--clean`. |
| Black screen, `supabaseUrl is required` | Fixed. The Supabase client used to be built at import time and threw when unconfigured, taking the whole app down before anything rendered. It is lazy now, and a missing backend only disables syncing. |
| `Unsupported FormDataPart implementation` | Fixed. React Native 0.86's `fetch` rejects the `{uri, name, type}` file part its own FormData documents. Multipart uploads go through `XMLHttpRequest` instead. |
| Product photo comes out a black silhouette | Fixed. Skia's colour matrix adds its offset in normalised 0..1 units; the offset was written in 0..255 units, so every pixel clamped to zero while alpha survived. This looked like a bad segmentation model and was a unit error. |
| Published product missing from the catalog | Fixed. The catalog rendered a hardcoded mock list and never read the database. |
| Two similar apps on the phone | Ours is `com.kaarigar.app`. If you also have `in.karigar.karigar` installed, check which one you opened. |
| App works, then stops reaching the services | The laptop's address changed. Restart the gateway, take the address it prints, update `apps/mobile/.env`, reload. |
| `Couldn't reverse port 8081: device offline` | Transient, usually the screen locking during install. `adb reverse tcp:8081 tcp:8081` once the phone is awake. |

---

## What works, and what does not

| | State |
|---|---|
| Capture, quality gates, background removal | Works, fully on the phone, offline |
| Voice recording and playback | Works |
| Listing generation, bilingual | Works, about 20 seconds |
| Pricing with reasoning | Works |
| Saving to the local database | Works |
| Catalog listing saved products | Works |
| Upload to Supabase | Wired, needs the anon key present |
| Publishing to real channels | Not built, publishing records intent locally |
| Server-side background removal | Not built, rescue path for weak devices |
| Text to speech readback | Not built |
| Firebase phone auth | Not built, products save under a local id |

Because sign-in does not exist yet, rows are saved under the artisan id `local`,
defined in `services/offline/artisan.ts`. When auth lands, those rows need
migrating to the real artisan id rather than being abandoned.
