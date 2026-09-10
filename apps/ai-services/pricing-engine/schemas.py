"""Request and response models for the pricing engine.

The mobile client sends ``JSON.stringify(request)`` over a camelCase
TypeScript object, so requests arrive camelCase even though the contract
markdown shows snake_case. Both are accepted. Responses go out camelCase to
match ``PricingSuggestionResponse`` in packages/shared-types.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Dimensions(CamelModel):
    length: float | None = None
    width: float | None = None
    height: float | None = None
    unit: str = "cm"


class QualityIndicators(CamelModel):
    thread_count: Literal["low", "medium", "high"] | None = None
    pattern_complexity: Literal["simple", "medium", "complex"] | None = None


class PricingRequest(CamelModel):
    category: str
    sub_category: str | None = None
    material: str | None = None
    technique: str | None = None
    region: str | None = None
    gi_tag: str | None = None
    raw_material_cost: float | None = None
    labor_hours: float | None = None
    dimensions: Dimensions | None = None
    colors: list[str] = Field(default_factory=list)
    quality_indicators: QualityIndicators | None = None
    # Optional, so the reasoning can be read aloud in the artisan's language.
    language: Literal["hi", "en", "ta", "bn"] = "hi"


# ─── What the model is asked for ──────────────
# Note what is absent: the model is never asked for a price. It is asked for
# percentage adjustments and an explanation. The arithmetic stays in Python so
# the number can always be traced back to the artisan's own costs.


class Adjustment(BaseModel):
    factor: str = Field(description="Short name, such as 'GI Tag Premium'.")
    impact_percent: float = Field(
        ge=-30,
        le=60,
        description="Percentage change to apply on top of the floor price.",
    )
    reason: str = Field(description="One plain sentence an artisan would understand.")


class Comparable(BaseModel):
    title: str = Field(description="A similar product, named in the artisan's language.")
    price: float = Field(description="Typical Indian retail price in rupees.")


class PricingAdvice(BaseModel):
    adjustments: list[Adjustment] = Field(
        description="Two to four factors that move this product above or below its floor."
    )
    comparables: list[Comparable] = Field(
        description="Three comparable products with realistic Indian retail prices."
    )
    summary_en: str = Field(description="Two sentences explaining the price, in English.")
    summary_regional: str = Field(
        description="The same explanation in the artisan's language."
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="How well the given attributes support a price estimate.",
    )
