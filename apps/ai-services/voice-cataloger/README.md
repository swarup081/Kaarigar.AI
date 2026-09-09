# Voice-to-Listing Cataloger Service

Takes a voice recording in a regional language and produces:
- Transcription (via Bhashini ASR)
- Translation to English + Hindi (via Bhashini NMT)
- SEO-friendly product listing (via LLM prompt engineering)
- Extracted product attributes (material, technique, region, GI tag)

## Pipeline Flow
```
Voice Audio → Bhashini ASR (regional → text) → Bhashini NMT (text → English/Hindi)
                                                       ↓
                                              LLM (generate listing)
                                                       ↓
                                              Structured listing output
```

## Supported Languages
- Hindi (hi), English (en), Tamil (ta), Bengali (bn)

## API Endpoint
```
POST /api/voice-to-listing
Content-Type: multipart/form-data
```

See `/docs/api-contracts/voice-cataloger.md` for full request/response spec.

## Quick Start
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```
