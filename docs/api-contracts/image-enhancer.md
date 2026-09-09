# 📸 Image Enhancement API Contract

## Endpoint
```
POST /api/enhance-image
Content-Type: multipart/form-data
```

## Request

### Form Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | ✅ | Product photo (JPEG/PNG, max 10MB) |
| `options` | JSON string | ❌ | Processing options |

### Options Object

```json
{
  "background": "white",        // "white" | "wood" | "cloth" | "transparent"
  "crop_ratio": "1:1",          // "1:1" | "4:5" | "3:4"
  "enhance_quality": true,      // Lighting/color correction
  "upscale": false              // 2x upscale
}
```

## Response (200 OK)

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "results": {
    "enhanced_image_url": "https://storage.supabase.co/.../enhanced.jpg",
    "thumbnail_url": "https://storage.supabase.co/.../thumb.jpg",
    "original_dimensions": { "width": 3024, "height": 4032 },
    "enhanced_dimensions": { "width": 1080, "height": 1080 },
    "detected_attributes": {
      "dominant_colors": ["#8B4513", "#FFD700", "#DC143C"],
      "product_category_guess": "textile",
      "has_pattern": true,
      "pattern_type": "floral"
    }
  },
  "processing_time_ms": 2340
}
```

## Error Response (4xx/5xx)

```json
{
  "job_id": "uuid-string",
  "status": "failed",
  "error": {
    "code": "IMAGE_TOO_DARK",
    "message": "The image is too dark to process reliably",
    "suggestions": [
      "Move to a well-lit area",
      "Turn on a desk lamp",
      "Use natural daylight"
    ]
  },
  "processing_time_ms": 450
}
```

## Error Codes

| Code | Description |
|---|---|
| `IMAGE_TOO_DARK` | Image brightness below threshold |
| `IMAGE_TOO_BRIGHT` | Image overexposed |
| `IMAGE_BLURRY` | Image sharpness below threshold |
| `NO_PRODUCT_DETECTED` | Could not isolate product from background |
| `FILE_TOO_LARGE` | Exceeds 10MB limit |
| `INVALID_FORMAT` | Not a valid image file |
| `PROCESSING_ERROR` | Internal processing failure |

## Implementation Notes

- Use **rembg** (with U²-Net or BiRefNet model) for background removal
- Upload enhanced images to Supabase Storage bucket `enhanced-images`
- Return public URLs from Supabase Storage
- Processing time target: < 5 seconds for standard enhancement
- The `detected_attributes` are used by Voice-to-Listing to pre-fill category/color info
