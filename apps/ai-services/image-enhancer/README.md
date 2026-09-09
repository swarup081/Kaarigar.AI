# Image Enhancement Service

Accepts a product photo and returns:
- Background-removed image (white/transparent/styled background)
- Lighting/color-corrected image
- Auto-cropped to standard marketplace ratios (1:1, 4:5, 3:4)
- Detected product attributes (colors, category, pattern type)

## Tech Stack
- **rembg** with U²-Net or BiRefNet for background segmentation
- **OpenCV** for lighting correction, white balance, histogram equalization
- **Pillow** for image composition and resizing
- **FastAPI** for the REST API

## API Endpoint

```
POST /api/enhance-image
Content-Type: multipart/form-data
```

See `/docs/api-contracts/image-enhancer.md` for full request/response spec.

## Quick Start
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
