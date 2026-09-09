# TTS (Text-to-Speech) Service

Wraps the Bhashini TTS API to convert text into speech in regional languages.
Used to read AI-generated listings back to artisans before publishing.

## Supported Languages
- Hindi (hi), English (en), Tamil (ta), Bengali (bn)

## API Endpoint
```
POST /api/text-to-speech
Content-Type: application/json
```

See `/docs/api-contracts/tts-service.md` for full request/response spec.

## Quick Start
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```
