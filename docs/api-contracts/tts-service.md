# 🔊 Text-to-Speech API Contract

## Endpoint
```
POST /api/text-to-speech
Content-Type: application/json
```

## Request

```json
{
  "text": "आपके प्रोडक्ट का नाम है बनारसी रेशमी दुपट्टा...",
  "language": "hi",
  "voice_gender": "female"
}
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | ✅ | Text to convert to speech (max 5000 chars) |
| `language` | string | ✅ | Language code: `hi`, `en`, `ta`, `bn` |
| `voice_gender` | string | ❌ | `male` or `female` (default: `female`) |

## Response (200 OK)

```json
{
  "audio_url": "https://storage.supabase.co/.../tts_abc123.wav",
  "duration_seconds": 12.5,
  "language": "hi"
}
```

## Error Codes

| Code | Description |
|---|---|
| `TEXT_TOO_LONG` | Text exceeds 5000 character limit |
| `LANGUAGE_NOT_SUPPORTED` | Requested language not available |
| `TTS_FAILED` | Bhashini TTS service failure |

## Implementation Notes

- Use **Bhashini TTS API** (`tts` task type)
- Service: `ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4`
- Upload generated audio to Supabase Storage bucket `voice-recordings`
- Return the public URL
- Audio format: WAV or MP3
- Target latency: < 3 seconds for text under 500 chars
