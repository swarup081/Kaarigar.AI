# 💰 Pricing Engine API Contract

## Endpoint
```
POST /api/suggest-price
Content-Type: application/json
```

## Request

```json
{
  "category": "textile",
  "sub_category": "dupatta",
  "material": "silk",
  "technique": "handloom",
  "region": "Varanasi",
  "gi_tag": "Banaras Brocades and Sarees",
  "raw_material_cost": 400,
  "labor_hours": 8,
  "dimensions": {
    "length": 250,
    "width": 80,
    "unit": "cm"
  },
  "colors": ["gold", "red", "maroon"],
  "quality_indicators": {
    "thread_count": "high",
    "pattern_complexity": "complex"
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | ✅ | Craft category |
| `sub_category` | string | ❌ | Sub-category |
| `material` | string | ❌ | Primary material |
| `technique` | string | ❌ | Making technique |
| `region` | string | ❌ | Origin region |
| `gi_tag` | string | ❌ | GI tag if applicable |
| `raw_material_cost` | number | ❌ | In INR |
| `labor_hours` | number | ❌ | Hours of labor |
| `dimensions` | object | ❌ | Product dimensions |
| `colors` | string[] | ❌ | Dominant colors |
| `quality_indicators` | object | ❌ | Quality hints |

## Response (200 OK)

```json
{
  "job_id": "uuid-string",
  "suggested_price": {
    "min": 800,
    "max": 1500,
    "recommended": 1100,
    "currency": "INR"
  },
  "reasoning": {
    "summary": "Based on your cost of ₹800, similar items selling at ₹950-₹1400, and a GI Tag premium, we recommend ₹1100.",
    "summary_hi": "आपकी लागत ₹800, समान प्रोडक्ट ₹950-₹1400 में बिकते हैं, और GI Tag प्रीमियम के साथ, हम ₹1100 सुझाते हैं।",
    "cost_breakdown": {
      "raw_material": 400,
      "labor": 400,
      "overhead": 80,
      "fair_margin": 220,
      "floor_price": 800
    },
    "market_comparables": [
      { "title": "बनारसी रेशमी दुपट्टा", "price": 1200, "source": "reference_db" },
      { "title": "हथकरघा रेशमी स्टोल", "price": 950, "source": "reference_db" },
      { "title": "फूल बूटी दुपट्टा", "price": 1400, "source": "reference_db" }
    ],
    "adjustments": [
      { "factor": "GI Tag Premium", "impact": "+15%", "reason": "Products with GI tags command 10-20% premium" },
      { "factor": "High Thread Count", "impact": "+5%", "reason": "Superior thread count indicates quality" },
      { "factor": "Complex Pattern", "impact": "+3%", "reason": "Complex patterns require more skill and time" }
    ],
    "confidence": 0.78,
    "sample_size": 47
  }
}
```

## Pricing Pipeline (3 Steps)

### Step 1: Deterministic Floor Price (runs locally)
```
floor_price = raw_material_cost + (labor_hours × labor_rate) + overhead
```
- Labor rates by craft type defined in `packages/shared-types/src/pricing.ts`
- Overhead: 10% default
- This runs in the app, not on your server

### Step 2: Market Comparable Lookup
- Query `price_references` table in Supabase for matching category/material/technique
- Return median price and range from similar products

### Step 3: AI Adjustment (your service)
- Input: floor price + market range + product attributes
- Output: adjusted range with reasoning
- Consider: GI tag premium, pattern complexity, regional demand, material rarity

**Key Rule**: The pricing must ALWAYS be explainable. Never return a price without reasoning. The artisan must understand WHY.
