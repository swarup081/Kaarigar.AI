# 🤖 Kaarigar AI Services

> **This directory is for the AI/ML teammate.**
> These services are called by the main Kaarigar app via REST APIs.

## Architecture

```
Kaarigar App → Supabase Edge Functions (gateway) → YOUR SERVICES (here)
```

The app and backend are built by Swarup. You build the AI microservices below.
Communication happens via the defined API contracts — no shared code, no conflicts.

## Services to Build

| Service | What it does | Key Tech |
|---|---|---|
| `image-enhancer/` | Background removal, lighting correction, crop/resize | rembg, OpenCV, BiRefNet |
| `voice-cataloger/` | Voice → ASR (Bhashini) → Translation → LLM listing generation | Bhashini API, LLM |
| `pricing-engine/` | Cost-plus + market comparable + ML adjustment pricing | Scikit-learn/XGBoost |
| `tts-service/` | Text-to-speech in regional languages | Bhashini TTS API |

## API Contracts

**Full API contracts with request/response schemas are in `/docs/api-contracts/`.**

Quick summary of endpoints your services must expose:

| Endpoint | Method | Description |
|---|---|---|
| `/api/enhance-image` | POST | Accepts image file, returns enhanced image URL + detected attributes |
| `/api/voice-to-listing` | POST | Accepts audio file + language, returns transcription + generated listing |
| `/api/suggest-price` | POST | Accepts product attributes, returns price range + reasoning |
| `/api/text-to-speech` | POST | Accepts text + language, returns audio URL |

## Authentication

Use a shared API key (`X-API-Key` header) between our services. Store it in environment variables.

## Setup

```bash
# Each service is independent — pick one and start
cd image-enhancer/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001

cd voice-cataloger/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8002

cd pricing-engine/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8003

cd tts-service/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8004
```

## Docker (optional, for deployment)

```bash
docker-compose up --build
```

## Environment Variables

```bash
# .env (create in each service directory)
BHASHINI_USER_ID=your_bhashini_user_id
BHASHINI_API_KEY=your_bhashini_api_key
BHASHINI_PIPELINE_ID=your_pipeline_id
LLM_API_KEY=your_llm_api_key
SHARED_API_KEY=shared_secret_with_backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

## Bhashini API Access

1. Register at https://bhashini.gov.in/
2. Get UserID and API Key from ULCA dashboard
3. Use the Config API to get available model/service IDs for your target languages
4. Supported languages: Hindi (hi), English (en), Tamil (ta), Bengali (bn)
5. Postman collection: https://www.postman.com/bhashini/workspace/bhashini-api-prod/overview

## File Storage

Upload processed images/audio to Supabase Storage using the service key.
Bucket name: `product-media`
Return the public URL in your response.
