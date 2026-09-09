# Pricing Engine Service

Calculates fair price suggestion using a hybrid approach:
1. **Cost-Plus Algorithm** (deterministic floor price)
2. **Market Comparable Data** (from reference database)
3. **ML Adjustment** (quality, GI tag, complexity factors)

Returns a price range with full "why" reasoning — never a black box.

## API Endpoint
```
POST /api/suggest-price
Content-Type: application/json
```

See `/docs/api-contracts/pricing-engine.md` for full request/response spec.

## Quick Start
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```
