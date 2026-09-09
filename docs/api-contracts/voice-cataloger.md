# 🎤 Voice-to-Listing API Contract

## Endpoint
```
POST /api/voice-to-listing
Content-Type: multipart/form-data
```

## Request

### Form Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `audio` | File | ✅ | Voice recording (WAV/M4A, max 30MB, max 5 minutes) |
| `source_language` | string | ✅ | Language code: `hi`, `en`, `ta`, `bn` |
| `target_languages` | JSON array | ❌ | Languages to translate into (default: `["en", "hi"]`) |
| `product_category` | string | ❌ | Category hint from image detection |
| `detected_attributes` | JSON string | ❌ | Attributes from image enhancement step |

## Response (200 OK)

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "results": {
    "transcription": {
      "original_text": "यह बनारसी रेशमी दुपट्टा है, इसमें फूल का बूटा है...",
      "language_detected": "hi",
      "confidence": 0.92
    },
    "listing": {
      "title": {
        "hi": "बनारसी रेशमी दुपट्टा - फूल बूटी डिज़ाइन",
        "en": "Banarasi Silk Dupatta - Floral Motif Design"
      },
      "description": {
        "hi": "यह हस्तनिर्मित बनारसी रेशमी दुपट्टा पारंपरिक हथकरघे पर बुना गया है...",
        "en": "This handcrafted Banarasi silk dupatta is woven on a traditional handloom..."
      },
      "bullet_features": {
        "hi": [
          "100% शुद्ध रेशम",
          "हाथ से बुनी फूल बूटी",
          "2.5 मीटर लंबाई",
          "बनारस, उत्तर प्रदेश"
        ],
        "en": [
          "100% Pure Silk",
          "Hand-woven Floral Motifs",
          "2.5 meters length",
          "Banaras, Uttar Pradesh"
        ]
      },
      "heritage_story": {
        "hi": "बनारस की बुनकरी परंपरा सदियों पुरानी है...",
        "en": "The weaving tradition of Banaras dates back centuries..."
      },
      "extracted_attributes": {
        "material": "silk",
        "technique": "handloom",
        "region": "Varanasi",
        "gi_tag": "Banaras Brocades and Sarees",
        "colors": ["gold", "red", "maroon"],
        "suitable_for": ["wedding", "festive", "daily_wear"]
      }
    }
  },
  "processing_time_ms": 8500
}
```

## Error Response

```json
{
  "job_id": "uuid-string",
  "status": "failed",
  "error": {
    "code": "AUDIO_TOO_SHORT",
    "message": "Recording is too short (minimum 3 seconds)"
  },
  "processing_time_ms": 200
}
```

## Error Codes

| Code | Description |
|---|---|
| `AUDIO_TOO_SHORT` | Recording < 3 seconds |
| `AUDIO_TOO_LONG` | Recording > 5 minutes |
| `AUDIO_TOO_NOISY` | Background noise too high for ASR |
| `LANGUAGE_NOT_SUPPORTED` | Requested language not available |
| `ASR_FAILED` | Bhashini ASR service failure |
| `TRANSLATION_FAILED` | Bhashini NMT service failure |
| `LLM_FAILED` | Listing generation LLM failure |
| `PROCESSING_ERROR` | Generic processing failure |

## Pipeline Details

```
Audio File
    → Bhashini ASR (speech → text in source language)
    → Bhashini NMT (text → English if source != English)
    → LLM Prompt (generate structured listing from text)
    → Structured JSON output
```

### Bhashini API Usage

1. **ASR (Automatic Speech Recognition)**: Use `asr` task type
   - Service: `ai4bharat/conformer-multilingual-indo_aryan-gpu--t4`
   - Languages: hi, ta, bn, en
2. **NMT (Neural Machine Translation)**: Use `translation` task type
   - Service: `ai4bharat/indictrans-v2-all-gpu--t4`
3. Pipeline ID from Bhashini Config API

### LLM Prompt Strategy

The LLM receives:
- Transcribed text (original + English)
- Product category hint
- Detected attributes from image

And generates:
- SEO-friendly title (both languages)
- Rich description (both languages)
- 4-6 bullet features
- Heritage story snippet
- Extracted attributes

**Important**: The listing should be SEO-optimized for Indian marketplace search (include material, technique, region, GI tag in title).
