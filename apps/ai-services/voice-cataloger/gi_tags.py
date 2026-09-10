"""Geographical Indication tags for Indian handicrafts.

A GI tag is a legal certification. Claiming one falsely is a claim made in the
artisan's name, not ours, so the language model is never allowed to produce a
tag freely. It picks from a shortlist filtered by the region the artisan named,
and whatever it returns is matched back against this table before it leaves the
service.

This is a working seed, not the full register. The GI Registry publishes the
complete list, which runs to several hundred handicraft entries. Expanding this
table is a data task, not a modelling one, and it is the single cheapest
accuracy win available to this service.
"""

from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz, process


@dataclass(frozen=True)
class GITag:
    name: str
    state: str
    region: str
    category: str


GI_TAGS: tuple[GITag, ...] = (
    # Textiles and handloom
    GITag("Banaras Brocades and Sarees", "Uttar Pradesh", "Varanasi", "textile"),
    GITag("Kanchipuram Silk", "Tamil Nadu", "Kanchipuram", "textile"),
    GITag("Pochampally Ikat", "Telangana", "Bhoodan Pochampally", "textile"),
    GITag("Chanderi Sarees", "Madhya Pradesh", "Chanderi", "textile"),
    GITag("Maheshwar Sarees and Fabrics", "Madhya Pradesh", "Maheshwar", "textile"),
    GITag("Baluchari Saree", "West Bengal", "Bishnupur", "textile"),
    GITag("Santipore Saree", "West Bengal", "Shantipur", "textile"),
    GITag("Jamdani Saree", "West Bengal", "Nadia", "textile"),
    GITag("Muga Silk of Assam", "Assam", "Assam", "textile"),
    GITag("Pashmina", "Jammu and Kashmir", "Kashmir", "textile"),
    GITag("Kullu Shawl", "Himachal Pradesh", "Kullu", "textile"),
    GITag("Patan Patola", "Gujarat", "Patan", "textile"),
    GITag("Bagh Prints", "Madhya Pradesh", "Bagh", "textile"),
    GITag("Sanganeri Hand Block Print", "Rajasthan", "Sanganer", "textile"),
    GITag("Bagru Hand Block Print", "Rajasthan", "Bagru", "textile"),
    GITag("Kota Doria", "Rajasthan", "Kota", "textile"),
    GITag("Venkatagiri Sarees", "Andhra Pradesh", "Venkatagiri", "textile"),
    GITag("Mysore Silk", "Karnataka", "Mysore", "textile"),
    GITag("Ilkal Sarees", "Karnataka", "Ilkal", "textile"),
    GITag("Sambalpuri Bandha Saree", "Odisha", "Sambalpur", "textile"),
    GITag("Kasaragod Sarees", "Kerala", "Kasaragod", "textile"),
    GITag("Solapur Chaddar", "Maharashtra", "Solapur", "textile"),
    GITag("Paithani Sarees and Fabrics", "Maharashtra", "Paithan", "textile"),
    # Embroidery
    GITag("Lucknow Chikan Craft", "Uttar Pradesh", "Lucknow", "embroidery"),
    GITag("Kutch Embroidery", "Gujarat", "Kutch", "embroidery"),
    GITag("Kashmir Sozani Craft", "Jammu and Kashmir", "Kashmir", "embroidery"),
    GITag("Phulkari", "Punjab", "Punjab", "embroidery"),
    GITag("Kasuti Embroidery", "Karnataka", "Dharwad", "embroidery"),
    # Pottery and clay
    GITag("Khurja Pottery", "Uttar Pradesh", "Khurja", "pottery"),
    GITag("Blue Pottery of Jaipur", "Rajasthan", "Jaipur", "pottery"),
    GITag("Molela Clay Work", "Rajasthan", "Molela", "pottery"),
    GITag("Black Pottery of Manipur", "Manipur", "Longpi", "pottery"),
    # Metalwork
    GITag("Moradabad Metal Craft", "Uttar Pradesh", "Moradabad", "metalwork"),
    GITag("Bidriware", "Karnataka", "Bidar", "metalwork"),
    GITag("Thanjavur Art Plate", "Tamil Nadu", "Thanjavur", "metalwork"),
    GITag("Dhokra Handicraft", "West Bengal", "Bankura", "metalwork"),
    GITag("Pembarthi Metal Craft", "Telangana", "Pembarthi", "metalwork"),
    GITag("Swamimalai Bronze Icons", "Tamil Nadu", "Swamimalai", "metalwork"),
    # Woodwork
    GITag("Channapatna Toys and Dolls", "Karnataka", "Channapatna", "woodwork"),
    GITag("Saharanpur Wood Craft", "Uttar Pradesh", "Saharanpur", "woodwork"),
    GITag("Kashmir Walnut Wood Carving", "Jammu and Kashmir", "Kashmir", "woodwork"),
    GITag("Nirmal Toys and Craft", "Telangana", "Nirmal", "woodwork"),
    GITag("Etikoppaka Toys", "Andhra Pradesh", "Etikoppaka", "woodwork"),
    # Painting
    GITag("Madhubani Paintings", "Bihar", "Mithila", "painting"),
    GITag("Pattachitra", "Odisha", "Puri", "painting"),
    GITag("Kalamkari", "Andhra Pradesh", "Srikalahasti", "painting"),
    GITag("Warli Painting", "Maharashtra", "Palghar", "painting"),
    GITag("Thanjavur Paintings", "Tamil Nadu", "Thanjavur", "painting"),
    GITag("Gond Painting", "Madhya Pradesh", "Mandla", "painting"),
    GITag("Kalighat Painting", "West Bengal", "Kolkata", "painting"),
    # Stone
    GITag("Agra Marble Inlay Work", "Uttar Pradesh", "Agra", "stone_carving"),
    GITag("Mahabalipuram Stone Sculpture", "Tamil Nadu", "Mahabalipuram", "stone_carving"),
    GITag("Konark Stone Carving", "Odisha", "Konark", "stone_carving"),
    # Jewellery and leather
    GITag("Temple Jewellery of Nagercoil", "Tamil Nadu", "Nagercoil", "jewelry"),
    GITag("Silver Filigree of Karimnagar", "Telangana", "Karimnagar", "jewelry"),
    GITag("Kolhapuri Chappal", "Maharashtra", "Kolhapur", "leather"),
    GITag("Indore Leather Toys", "Madhya Pradesh", "Indore", "leather"),
    # Bamboo and cane
    GITag("Sandur Lambani Embroidery", "Karnataka", "Sandur", "embroidery"),
    GITag("Kerala Screw Pine Craft", "Kerala", "Alappuzha", "bamboo"),
    GITag("Nagaland Bamboo Craft", "Nagaland", "Nagaland", "bamboo"),
)

_MATCH_THRESHOLD = 85


def shortlist(region: str | None, category: str | None, limit: int = 12) -> list[GITag]:
    """Candidate tags to offer the model.

    Filters by region or state when the artisan named one, then by category.
    An unfiltered shortlist would be a menu of things to guess from, so when we
    know nothing we return a small generic slice rather than the whole table.
    """
    candidates = list(GI_TAGS)

    if region:
        needle = region.strip().lower()
        located = [
            tag
            for tag in candidates
            if needle in tag.region.lower()
            or needle in tag.state.lower()
            or tag.region.lower() in needle
            or tag.state.lower() in needle
        ]
        if located:
            candidates = located

    if category:
        by_category = [tag for tag in candidates if tag.category == category]
        if by_category:
            candidates = by_category

    return candidates[:limit]


def resolve(claimed: str | None, allowed: list[GITag]) -> str | None:
    """Accept the model's tag only if it really is one we offered.

    Fuzzy matching covers harmless drift such as a dropped 'and' or a plural,
    but anything genuinely outside the shortlist is dropped rather than
    corrected, because a wrong GI tag is worse than none at all.
    """
    if not claimed or not allowed:
        return None

    names = [tag.name for tag in allowed]
    match = process.extractOne(claimed, names, scorer=fuzz.WRatio)
    if match and match[1] >= _MATCH_THRESHOLD:
        return match[0]
    return None


def format_for_prompt(tags: list[GITag]) -> str:
    """Renders the shortlist for the prompt."""
    if not tags:
        return "(no Geographical Indication tags apply to this region; use null)"
    return "\n".join(f"- {tag.name} ({tag.region}, {tag.state})" for tag in tags)
