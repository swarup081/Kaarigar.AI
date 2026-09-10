# Pricing Engine Service

Turns a product's attributes and the artisan's own costs into a fair price with
an explanation the artisan can argue with.

## Three steps, and only one uses a model

1. **Floor price, in Python.** `materials + (hours x rate) + overhead`, then a
   minimum fair margin on top. Plain arithmetic anyone can check on paper.
2. **Adjustments, from Gemini.** Percentages only, each with a reason.
3. **The final number, in Python.** Floor plus the adjustment stack, clamped so
   it can never fall below cost plus the minimum margin.

**The model is never asked for a rupee figure.** It proposes percentages and
writes the explanation. The arithmetic stays in code, so every price traces back
to the artisan's own inputs. That is what stops a confident model talking
someone into selling below cost, and it is enforced by a clamp, not a prompt.

If Gemini is unreachable the service still answers, returning the floor price
with an honest note that market comparison was unavailable. A degraded answer
beats no answer when someone is standing in a workshop waiting.

## Labour rates

`pricing.py` mirrors `DEFAULT_PRICING_CONFIG` in
`packages/shared-types/src/pricing.ts`. Change a rate in one place and you must
change it in the other, or the app and this service will quote different floors
for the same product.

## A note on the contract's worked example

`docs/api-contracts/pricing-engine.md` states the formula as
`floor = materials + labour + overhead`, but its example lists a floor of 800
while its own components sum to 880. The formula is implemented here; the
example's arithmetic does not follow it and should be corrected in that doc.

## Market comparables

Currently estimated by the model and labelled `"source": "ai_estimate"`, because
the `price_references` table in Supabase is empty. That label is deliberate: an
AI guess must never be presented as reference data.

Once roughly two hundred real observations are seeded, this service should read
from that table and report a real `sampleSize`. Until then `sampleSize` is 0 and
confidence stays low, which is the honest answer.

## Endpoint

```
POST /api/suggest-price
Content-Type: application/json
```

Accepts camelCase (what the app sends) or snake_case (what the contract shows).
Responds camelCase, matching `PricingSuggestionResponse` in the shared types.

Missing both `rawMaterialCost` and `laborHours` returns `INSUFFICIENT_COST_DATA`
rather than a guessed price.

`GET /health` reports whether Gemini and a reference database are configured.

## Setup

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in this directory:

```bash
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
SHARED_API_KEY=same_secret_as_the_gateway
```

Run it:

```bash
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

Try it:

```bash
curl -X POST http://localhost:8003/api/suggest-price \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SHARED_API_KEY" \
  -d '{"category":"textile","material":"silk","technique":"handloom",
       "region":"Varanasi","giTag":"Banaras Brocades and Sarees",
       "rawMaterialCost":400,"laborHours":8}'
```
