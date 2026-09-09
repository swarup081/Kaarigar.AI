# 🤖 AI Services — Getting Started Guide
## For the AI/ML Teammate

Hey! Here's everything you need to start building the AI microservices for Kaarigar. 
I've built the full mobile app + backend. You build the AI brain. Zero conflicts.

---

## 🗂️ Your Workspace

You work **ONLY** inside `/apps/ai-services/`. I don't touch this folder.

```
apps/ai-services/
├── image-enhancer/      ← Background removal, lighting fix, crop
├── voice-cataloger/     ← Voice → ASR → Translation → Listing (LLM)
├── pricing-engine/      ← Cost-plus + market data + ML pricing
├── tts-service/         ← Text-to-Speech in regional languages
├── docker-compose.yml   ← Run all services together
└── README.md            ← Full setup guide
```

---

## 🚀 Start Here (Priority Order)

### Service 1: Image Enhancer (Port 8001) — START WITH THIS
**What it does**: Takes a product photo → removes background → fixes lighting → crops to marketplace ratio → detects product attributes (colors, category, pattern).

**Tech**: `rembg` (U²-Net/BiRefNet) + `OpenCV` + `Pillow` + `FastAPI`

**Quick start**:
```bash
cd apps/ai-services/image-enhancer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Create main.py with FastAPI app
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**API Spec**: See `docs/api-contracts/image-enhancer.md`

---

### Service 2: Voice Cataloger (Port 8002)
**What it does**: Takes voice recording (Hindi/Tamil/Bengali/English) → ASR transcription → English translation → LLM generates SEO listing.

**Pipeline**:
```
Voice Audio → Bhashini ASR → Bhashini NMT → LLM → Structured Listing JSON
```

**Tech**: `Bhashini API` (free govt API) + LLM (Gemini/OpenAI) + `FastAPI`

**Bhashini Setup**:
1. Register at https://bhashini.gov.in/ulca
2. Get UserID + API Key from ULCA dashboard
3. Use Config API to get model/pipeline IDs
4. Supported: Hindi (hi), English (en), Tamil (ta), Bengali (bn)

**API Spec**: See `docs/api-contracts/voice-cataloger.md`

---

### Service 3: Pricing Engine (Port 8003)
**What it does**: Takes product attributes → calculates fair price range → returns transparent reasoning.

**3-Step Pipeline**:
1. **Floor Price** (deterministic): `material_cost + (hours × labor_rate) + overhead` — this already runs in the app
2. **Market Comparables**: Query similar products from reference database
3. **AI Adjustment**: ML model adjusts for GI tag, complexity, regional demand

**Key Rule**: NEVER return a price without reasoning. Artisans must understand "why this price."

**Tech**: `scikit-learn` or `XGBoost` + `FastAPI`

**API Spec**: See `docs/api-contracts/pricing-engine.md`

---

### Service 4: TTS Service (Port 8004)
**What it does**: Text → Speech in regional languages. Used to read AI-generated listings back to artisans.

**Tech**: `Bhashini TTS API` + `FastAPI`

**API Spec**: See `docs/api-contracts/tts-service.md`

---

## 🔗 How Our Code Connects

```
Mobile App → Supabase Edge Function (AI Gateway) → YOUR SERVICES
```

The app calls Supabase. Supabase routes to your services via the AI Gateway. You don't need to worry about auth — the gateway handles it.

**Authentication**: Use `X-API-Key` header. The shared key is in `.env` as `AI_SHARED_API_KEY`.

**File Storage**: Upload processed images/audio to Supabase Storage:
- Bucket: `enhanced-images` (for processed photos)
- Bucket: `voice-recordings` (for TTS output)
- Use the Supabase service key (I'll share it with you)

---

## 📋 API Contract Summary

| Endpoint | Method | Port | Input | Output |
|---|---|---|---|---|
| `/api/enhance-image` | POST | 8001 | Image file + options | Enhanced image URL + detected attributes |
| `/api/voice-to-listing` | POST | 8002 | Audio file + language | Transcription + structured listing |
| `/api/suggest-price` | POST | 8003 | Product attributes JSON | Price range + reasoning |
| `/api/text-to-speech` | POST | 8004 | Text + language | Audio URL |

Full specs with request/response schemas are in `docs/api-contracts/`.

---

## 🔑 Environment Variables You Need

Create `.env` in each service directory:

```bash
# Bhashini (for voice-cataloger and tts-service)
BHASHINI_USER_ID=your_id
BHASHINI_API_KEY=your_key
BHASHINI_PIPELINE_ID=your_pipeline_id

# LLM (for voice-cataloger listing generation)
LLM_API_KEY=your_gemini_or_openai_key

# Supabase (for uploading processed files)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Shared API Key (same as backend)
SHARED_API_KEY=shared_secret_from_team
```

---

## 🧪 Testing Your Services

Each service should work standalone:

```bash
# Test image enhancer
curl -X POST http://localhost:8001/api/enhance-image \
  -H "X-API-Key: your_shared_key" \
  -F "image=@test_photo.jpg" \
  -F 'options={"background":"white","crop_ratio":"1:1"}'

# Test pricing engine
curl -X POST http://localhost:8003/api/suggest-price \
  -H "X-API-Key: your_shared_key" \
  -H "Content-Type: application/json" \
  -d '{"category":"textile","material":"silk","raw_material_cost":400,"labor_hours":8}'
```

---

## 🐳 Docker (for deployment)

```bash
cd apps/ai-services
docker-compose up --build
```

This runs all 4 services. I'll handle deployment from there.

---

## ❓ Questions?

- **TypeScript types**: See `packages/shared-types/src/ai-requests.ts` for exact request/response schemas
- **What the app sends you**: The mobile app captures photos + voice recordings locally, then sends them through the gateway
- **What you return**: Always return JSON with `status`, `results`, and `processing_time_ms`

Let's build! 🚀
