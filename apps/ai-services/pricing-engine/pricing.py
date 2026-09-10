"""The deterministic half of pricing.

This mirrors DEFAULT_PRICING_CONFIG in packages/shared-types/src/pricing.ts.
If you change a labour rate here, change it there too, or the app and the
service will quote different floors for the same product.

Nothing in this module calls a model. That is deliberate: the floor price is
what stops an artisan being talked into selling below cost, so it has to be
arithmetic that anyone can check on paper.
"""

from __future__ import annotations

from dataclasses import dataclass

# Rupees per hour of skilled labour, by craft.
LABOR_RATE_PER_HOUR: dict[str, float] = {
    "textile": 50,
    "pottery": 40,
    "jewelry": 60,
    "woodwork": 45,
    "metalwork": 55,
    "leather": 45,
    "bamboo": 35,
    "stone_carving": 50,
    "painting": 60,
    "embroidery": 50,
    "other": 40,
}

OVERHEAD_PERCENTAGE = 10.0

# Fair margin bands, as percentages, by how rare the craft is.
MARGIN_RANGE: dict[str, tuple[float, float]] = {
    "common": (20, 30),
    "traditional": (25, 40),
    "rare": (30, 50),
    "gi_tagged": (35, 60),
}


@dataclass(frozen=True)
class CostBreakdown:
    raw_material: float
    labor: float
    #: Materials and labour at the overhead percentage.
    overhead: float
    #: The minimum fair margin in rupees, on top of the floor.
    fair_margin: float
    #: Cost only, per the formula in the API contract. Excludes margin.
    floor_price: float

    @property
    def minimum_price(self) -> float:
        """The lowest figure we will ever recommend: cost plus a fair minimum."""
        return self.floor_price + self.fair_margin

    def as_dict(self) -> dict[str, float]:
        return {
            "rawMaterial": round(self.raw_material, 2),
            "labor": round(self.labor, 2),
            "overhead": round(self.overhead, 2),
            "fairMargin": round(self.fair_margin, 2),
            "floorPrice": round(self.floor_price, 2),
        }


def rarity_band(gi_tag: str | None, technique: str | None) -> str:
    """Which margin band this product sits in."""
    if gi_tag:
        return "gi_tagged"
    if technique and any(
        word in technique.lower()
        for word in ("hand", "handloom", "carv", "block", "filigree", "inlay")
    ):
        return "traditional"
    return "common"


def compute(
    *,
    category: str,
    raw_material_cost: float | None,
    labor_hours: float | None,
    gi_tag: str | None,
    technique: str | None,
) -> CostBreakdown:
    """Cost-plus floor price.

        floor  = materials + (hours x rate) + overhead
        margin = floor x minimum band percentage

    This is the formula written in docs/api-contracts/pricing-engine.md, where
    the floor is cost only and the margin sits on top of it as its own line.
    The worked example in that document does not follow its own formula, so the
    formula is what is implemented here.

    Missing inputs are treated as zero rather than estimated. A floor built on
    guessed costs is not a floor, and the app collects these numbers from the
    artisan directly for exactly this reason.
    """
    materials = max(0.0, raw_material_cost or 0.0)
    hours = max(0.0, labor_hours or 0.0)
    rate = LABOR_RATE_PER_HOUR.get(category, LABOR_RATE_PER_HOUR["other"])

    labor = hours * rate
    direct = materials + labor
    overhead = direct * (OVERHEAD_PERCENTAGE / 100.0)
    floor = direct + overhead

    band = rarity_band(gi_tag, technique)
    margin_low, _ = MARGIN_RANGE[band]

    return CostBreakdown(
        raw_material=materials,
        labor=labor,
        overhead=overhead,
        fair_margin=floor * (margin_low / 100.0),
        floor_price=floor,
    )


def margin_ceiling(breakdown: CostBreakdown, gi_tag: str | None, technique: str | None) -> float:
    """The top of the fair band, used to sanity-check what the model suggests."""
    band = rarity_band(gi_tag, technique)
    _, margin_high = MARGIN_RANGE[band]
    return breakdown.floor_price * (1 + margin_high / 100.0)
