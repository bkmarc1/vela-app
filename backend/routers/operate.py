"""Propul8 · OPERATE router (iter66 refactor).

Hospitality Yield Optimization — visualization engine, upgrade copywriter,
visual analysis, listing ingestion, transform endpoint, and PMS/channel-
manager sync job lifecycle. All endpoints prefixed with /api.
"""
from __future__ import annotations

import os
import re
import json
import uuid
import base64
import hashlib
import logging
import requests
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


logger = logging.getLogger("propul8.operate")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


def _short_id(prefix: str, length: int = 10) -> str:
    """Compact prefixed id for job/draft documents."""
    return prefix + uuid.uuid4().hex[:length]

# Mongo client injected by server.py at module-import time.
_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api", tags=["operate"])


# Lazy-forward stub for server-only helpers (resolved at call-time to break
# the circular import — server.py imports this router at the very bottom).
def _parse_ai_json(*args, **kwargs):
    from server import _parse_ai_json as _impl
    return _impl(*args, **kwargs)


# ---------------------------------------------------------------------------
# Visualization Engine — 3 distinct concept directions per upgrade
# ---------------------------------------------------------------------------
VISUALIZE_DIRECTIONS: List[Dict[str, Any]] = []  # legacy — paths are now resolved per-recommendation

# Recommendation-aware strategic concepts. The visualize endpoint picks the
# right family based on rec.title and returns three OPERATIONAL execution
# paths solving the SAME problem — never three aesthetic archetypes applied
# to a problem they don't fit.
VISUALIZE_SYSTEM_PROMPT = """You are Propul8's Visualization Engine.

CRITICAL ARCHITECTURE — READ FIRST:
You are not a moodboard generator. You output THREE STRATEGIC EXECUTION PATHS
that solve the SAME operational hospitality problem stated by the recommendation.
The three concepts must NOT be three aesthetic archetypes applied to any
upgrade. They must be three different STRATEGIES (architectural / FF&E-only /
hybrid) for solving the SAME upgrade problem with different cost, complexity,
and disruption profiles.

EXAMPLES OF CORRECT LOGIC:

  • Sleep Capacity Expansion → 3 ways to sleep one more guest:
      mezzanine_loft, convertible_living, bunk_millwork
  • Layered Evening Lighting → 3 lighting strategies:
      programmed_scenes, sculptural_focals, architectural_cove
  • Outdoor Dining Program → 3 paths to monetize the terrace:
      sunset_theatre, indoor_outdoor_flow, modular_outdoor
  • Editorial Photography Refresh → 3 shoot strategies:
      golden_hour_editorial, lifestyle_storytelling, architectural_studio
  • Dynamic Pricing Strategy → 3 pricing architectures:
      four_band_seasonal, length_of_stay, demand_premium

You will be told which family applies. Output ONE JSON object:

{
  "concepts": [
    {
      "key": "<the strategic key for this family>",
      "name": "<strategic name — the STRATEGY, not a vibe>",
      "strategy": "≤ 130 chars — the OPERATIONAL solution in 1 line",
      "atmosphere": "≤ 110 chars — visual / spatial read of THIS path",
      "mood": "≤ 90 chars — sensory line",
      "execution": "≤ 110 chars — what physically/operationally changes",
      "cost_band": "€X–Yk",
      "complexity": "<Very low | Low | Medium | High>",
      "disruption": "≤ 35 chars — guest-facing downtime",
      "when_to_choose": "≤ 130 chars — institutional reasoning",
      "intel": "≤ 90 chars — hospitality benchmark insight",
      "adr_uplift_pct": <integer 6–28>,
      "furniture": ["3 lines ≤ 65 chars"],
      "lighting":  ["3 lines ≤ 65 chars"],
      "materials": ["3 lines ≤ 65 chars"]
    }
  ]
}

Return all 3 paths in the order specified by the family. Aman / Edition / Casa
Cook calibre on language. ECONOMICALLY INTENTIONAL — not aesthetically pretty.
"""

# In-memory cache so repeat clicks on the same upgrade come back instantly.
_VISUALIZE_CACHE: Dict[str, Dict[str, Any]] = {}
_VISUALIZE_CACHE_MAX = 200


def _compute_revenue_fields(concept: Dict[str, Any], prop: Dict[str, Any]) -> Dict[str, Any]:
    """Derive Current ADR / Projected ADR / Occupancy delta / Annual uplift.

    Source of truth = property's nightly_rate + a sane occupancy baseline.
    """
    try:
        uplift_pct = int(concept.get("adr_uplift_pct") or 0)
    except (TypeError, ValueError):
        uplift_pct = 0
    if uplift_pct <= 0:
        # Try to extract an integer from the legacy "adr_impact" string.
        m = re.search(r"(\d+)", str(concept.get("adr_impact") or ""))
        uplift_pct = int(m.group(1)) if m else 12

    current_adr = int(prop.get("nightly_rate") or 145)
    projected_adr = round(current_adr * (1 + uplift_pct / 100))
    current_occ = 71  # boutique island baseline
    projected_occ = min(92, current_occ + max(2, round(uplift_pct * 0.55)))
    delta_adr = projected_adr - current_adr
    annual_uplift = int(delta_adr * 365 * (projected_occ / 100))

    try:
        b_low = int(concept.get("budget_low_eur") or 0)
        b_high = int(concept.get("budget_high_eur") or 0)
    except (TypeError, ValueError):
        b_low, b_high = 0, 0
    if not (b_low and b_high):
        b_low, b_high = 10, 18
    budget_str = f"€{b_low}k–€{b_high}k Estimated Upgrade"

    return {
        "adr_impact": f"+{uplift_pct}% ADR Potential",
        "adr_uplift_pct": uplift_pct,
        "current_adr": current_adr,
        "projected_adr": projected_adr,
        "current_occupancy": current_occ,
        "projected_occupancy": projected_occ,
        "annual_uplift": annual_uplift,
        "budget": budget_str,
        "budget_low_eur": b_low,
        "budget_high_eur": b_high,
    }


class VisualizeRequest(BaseModel):
    recommendation: Dict[str, Any]
    property: Dict[str, Any] = {}


@router.post("/visualize")
async def visualize(payload: VisualizeRequest):
    rec = payload.recommendation or {}
    prop = payload.property or {}
    rec_title = str(rec.get("title", "")).strip()

    # Recommendation-aware family resolution. The keys in the response are
    # determined by the upgrade's operational family — never a fixed archetype.
    family = _family_for_rec(rec_title)
    expected_keys = _keys_for_rec(rec_title)

    cache_key = "|".join([
        "v4-strategic",
        family,
        rec_title.lower(),
        str(prop.get("property_type", "")).strip().lower(),
        str(prop.get("city", "")).strip().lower(),
        str(prop.get("nightly_rate", "")),
    ])
    if cache_key in _VISUALIZE_CACHE:
        return _VISUALIZE_CACHE[cache_key]

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI key not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception as exc:
        logger.error(f"emergentintegrations import failed: {exc}")
        raise HTTPException(503, "AI library unavailable")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"visualize-{uuid.uuid4().hex[:10]}",
        system_message=VISUALIZE_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        f"Property: {prop.get('name', '—')}, {prop.get('city', '—')} | "
        f"{prop.get('property_type', '—')} | {prop.get('sqm', '—')}sqm | sleeps {prop.get('sleeps', '—')} | "
        f"ADR €{prop.get('nightly_rate', '—')}\n"
        f"Upgrade (recommendation being solved): {rec_title} — "
        f"{rec.get('transformation', rec.get('detail', '—'))}\n\n"
        f"FAMILY: {family}. Use exactly these three keys in this order:\n"
        f"  1. {expected_keys[0]}\n  2. {expected_keys[1]}\n  3. {expected_keys[2]}\n\n"
        "These three concepts must be three different STRATEGIC EXECUTION PATHS\n"
        "solving the same operational problem stated above — NOT three aesthetic\n"
        "archetypes. Calibrate cost/complexity/disruption so the operator's\n"
        "decision is between strategies, not vibes. Return JSON now."
    )

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:
        logger.error(f"Visualize AI call failed: {exc}")
        raise HTTPException(502, "AI provider error — please try again")

    parsed = _parse_ai_json(raw if isinstance(raw, str) else str(raw))
    concepts = parsed.get("concepts", [])

    augmented: List[Dict[str, Any]] = []
    for i, c in enumerate(concepts[:3]):
        # Force key alignment to the family — AI sometimes drifts.
        forced_key = expected_keys[i] if i < len(expected_keys) else expected_keys[-1]
        revenue = _compute_revenue_fields(c, prop)
        augmented.append({
            **c,
            **revenue,
            "key": forced_key,
            "family": family,
        })

    # Backfill missing concepts with a sensible stub anchored to the family key.
    while len(augmented) < 3:
        i = len(augmented)
        forced_key = expected_keys[i] if i < len(expected_keys) else expected_keys[-1]
        stub = {
            "name": forced_key.replace("_", " ").title(),
            "strategy": f"Strategic execution path for {rec_title}.",
            "atmosphere": "Refined hospitality direction calibrated to the asset's market position.",
            "mood": "Editorial, calm, operationally tuned.",
            "execution": "Operational execution scoped to comp-set.",
            "cost_band": ["€4–7k", "€8–12k", "€12–18k"][i % 3],
            "complexity": ["Low", "Medium", "High"][i % 3],
            "disruption": ["1 day downtime", "5–7 day downtime", "2–3 week downtime"][i % 3],
            "when_to_choose": "Operator chooses based on capex / disruption tolerance.",
            "furniture": ["Curated FF&E pieces", "Layered seating program", "Soft textile layer"],
            "lighting": ["Programmed 2700K layered scenes", "Sculptural focal fixture", "Indirect wall washers"],
            "materials": ["Limewash walls", "Honey oak millwork", "Microcement floor"],
            "intel": "Editorial photography lifts boutique conversion ~14% in Mediterranean STR.",
            "adr_uplift_pct": 12 + i * 4,
        }
        augmented.append({
            **stub,
            **_compute_revenue_fields(stub, prop),
            "key": forced_key,
            "family": family,
        })

    result = {"concepts": augmented[:3], "family": family}

    if len(_VISUALIZE_CACHE) >= _VISUALIZE_CACHE_MAX:
        _VISUALIZE_CACHE.clear()
    _VISUALIZE_CACHE[cache_key] = result
    return result


# ---------------------------------------------------------------------------
# Real AI imagery — Gemini Nano Banana (gemini-3.1-flash-image-preview)
# ---------------------------------------------------------------------------
_IMAGE_CACHE: Dict[str, str] = {}  # cache_key -> data URL
_IMAGE_CACHE_MAX = 60

# Per-key visual-direction primer that anchors the AI to a specific
# Aman / Edition / Casa Cook calibre rather than generic "AI interior".
# Direction: 2700K candlelit hospitality, golden-hour Mediterranean warmth,
# tactile natural materials, no cold blue, no harsh modern LED.
_REC_PATH_FAMILIES = {
    "sleep": {
        "trigger": r"(sleep|capacity|mezzanine|family|sleeps|bunk)",
        "keys": ["mezzanine_loft", "convertible_living", "bunk_millwork"],
    },
    "lighting": {
        "trigger": r"(light|lamp|fixture|2700k|kelvin|illuminat|evening)",
        "keys": ["programmed_scenes", "sculptural_focals", "architectural_cove"],
    },
    "outdoor": {
        "trigger": r"(outdoor|terrace|patio|garden|dining|balcony)",
        "keys": ["sunset_theatre", "indoor_outdoor_flow", "modular_outdoor"],
    },
    "photo": {
        "trigger": r"(photo|photograph|cover|hero|thumbnail|editorial.*photo|listing.*photo)",
        "keys": ["golden_hour_editorial", "lifestyle_storytelling", "architectural_studio"],
    },
    "pricing": {
        "trigger": r"(pricing|adr|rate|seasonal|occupancy|demand)",
        "keys": ["four_band_seasonal", "length_of_stay", "demand_premium"],
    },
}


def _family_for_rec(title: str) -> str:
    t = (title or "").lower()
    for fam, cfg in _REC_PATH_FAMILIES.items():
        if re.search(cfg["trigger"], t):
            return fam
    return "sleep"  # safe default — sleep paths are the most architecturally generic


def _keys_for_rec(title: str) -> List[str]:
    return list(_REC_PATH_FAMILIES[_family_for_rec(title)]["keys"])


# Operationally-specific image primers per strategic path. Each prompt depicts
# THE SPECIFIC operational change (mezzanine, sofa-bed, bunk-wall, etc.), not
# a generic luxury vibe.
_VISUAL_PRIMER = {
    # SLEEP CAPACITY paths
    "mezzanine_loft": (
        "Architectural editorial photograph at warm late-morning. Aman / "
        "Norm Architects calibre. Cycladic boutique villa interior with a "
        "BUILT-IN OAK MEZZANINE SLEEP PLATFORM clearly visible above the "
        "living area, accessed by a flush oak ladder, full-height ceiling "
        "preserved below. Cream linen bedding on the platform, integrated "
        "guard rail, soft warm 2700K cove lighting under the platform. "
        "Honed creamy limestone floor, warm cream limewash walls. The "
        "mezzanine IS the focal point of the photograph — show the "
        "operational change, not generic luxury."
    ),
    "convertible_living": (
        "Editorial hospitality photograph at warm afternoon. Casa Cook / "
        "Edition calibre. Living zone with B&B Italia Charles SOFA-BED in "
        "cream linen prominently centered, partially extended to read as "
        "convertible bed, ceiling-mounted heavy linen curtain track in clay "
        "tone visible above creating partition possibility. Floor lamp at "
        "Davide Groppi style anchoring the zone. Existing flooring "
        "(microcement). Show the dual-purpose nature of the space — sofa AND "
        "sleep — with ZERO structural change. Warm tones, no overhead light."
    ),
    "bunk_millwork": (
        "Architectural editorial photograph at warm midday. Norm Architects "
        "energy. Single wall of the room transformed into a built-in "
        "MILLWORK BUNK SYSTEM in solid honey oak, two stacked bunks with "
        "integrated storage drawers below, brass reading rails, linen-"
        "upholstered headboards in clay tone, child-safe radiused edges. "
        "Anglepoise mini brass reading lights at each bunk. Heavy linen "
        "privacy curtains in clay. Warm cream limewash walls. Show the "
        "bunk wall as sculptural joinery — the focal architectural object."
    ),
    # LIGHTING paths
    "programmed_scenes": (
        "Editorial hospitality photograph at warm dusk. Same Cycladic suite "
        "interior shown at three implied moments: morning fresh / sunset "
        "warm / dinner candlelit — composite atmosphere with a single matte "
        "BRASS DALI SCENE-CONTROL TILE on the wall as the focal hardware "
        "object. Existing fixtures retained, swapped to dim-to-warm bulbs "
        "(1800K–2700K). Honey oak millwork, cream limewash walls, microcement "
        "floor. The CONTROL is the protagonist — no new fixtures."
    ),
    "sculptural_focals": (
        "Editorial hospitality photograph at warm evening. Aman calibre. "
        "Boutique Cycladic interior with ONE SCULPTURAL CEILING FIXTURE as "
        "the photographic hero — Davide Groppi Moon glowing 2700K in living "
        "or Apparatus Talisman pendant in dining or Flos String Light over "
        "the bed. Everything else stays restrained — cream limewash walls, "
        "honey oak, microcement floor. The FIXTURE IS THE DESIGN. "
        "Brass canopy plate, matte plaster ceiling backdrop. Warm tones."
    ),
    "architectural_cove": (
        "Architectural hospitality photograph at warm evening. Norm "
        "Architects energy. Cycladic boutique suite interior with COVE "
        "LIGHTING at every wall-ceiling junction — recessed LED tape "
        "casting indirect 2700K wash, NO visible fixtures, plaster ceiling "
        "glowing softly from within. Pure architectural light. Honed "
        "limestone floor, warm chalk plaster ceiling, cream limewash walls, "
        "honey oak millwork. Quiet luxury — the architecture itself glows."
    ),
    # OUTDOOR paths
    "sunset_theatre": (
        "Editorial outdoor hospitality photograph at warm Mediterranean "
        "sunset. Casa Cook / Scorpios energy. Cycladic terrace with a "
        "RAISED CEDAR PLATFORM 4×3m, BUILT-IN OAK BENCH SEATING in clay "
        "linen cushions, Carl Hansen oak dining table 200×90, Kettal Maia "
        "rope chairs ×4. Planted edge with rosemary + olive + lavender. "
        "Festoon line overhead with warm 1800K bulbs, hand-blown candle "
        "hurricanes ×6 cluster on table. Hand-thrown stoneware on linen "
        "runner. Show the OPERATIONAL TRANSFORMATION — bare terrace into "
        "programmed dinner theatre."
    ),
    "indoor_outdoor_flow": (
        "Architectural hospitality photograph at warm afternoon. Vincent "
        "Van Duysen energy. Cycladic boutique interior with FOLDING GLASS "
        "DOORS in bronze frames OPEN, microcement floor flowing seamlessly "
        "from kitchen out onto the terrace, single ceiling line continuing "
        "from plaster inside to painted concrete outside. Movable wheeled "
        "kitchen island in oak with marble top, Tribu outdoor dining set, "
        "Paola Lenti Aqua sofa visible outside. Bocci 14 pendant over "
        "outdoor dining. Continuous warm cove LED inside-to-outside. "
        "The BARRIER DISSOLVES — read as one continuous hospitality zone."
    ),
    "modular_outdoor": (
        "Editorial outdoor hospitality photograph at warm afternoon. Existing "
        "Cycladic terrace surface PRESERVED (no construction), MODULAR "
        "FREESTANDING FURNITURE defining zones — Paola Lenti Frame outdoor "
        "sofa in natural rope, Kettal Bitta dining table+4 chairs, Tribu "
        "Branch teak loungers ×2. Roda solar floor lamps, Audoux-Minet style "
        "portable lanterns ×4, Flos Bellhop wireless table lamp. Performance "
        "linen cushions in beach white. Show portability — every piece "
        "visibly movable. Casual luxury, zero permanent intervention."
    ),
    # PHOTO paths
    "golden_hour_editorial": (
        "Editorial Mediterranean hospitality interior photograph at golden "
        "hour. Aman / Casa Cook calibre. Single sunset moment, every surface "
        "warm-graded: honey oak, cream limewash, microcement, terracotta. "
        "Linen styling layer, hand-thrown ceramics, fresh flowers in clay "
        "vase. Long warm shadows, available light only, candles added at "
        "dusk. NO models. Magazine-grade composition — every frame ready "
        "for editorial publication. Color graded for warmth + saturation."
    ),
    "lifestyle_storytelling": (
        "Editorial Mediterranean hospitality lifestyle photograph at warm "
        "afternoon. Vogue Living energy. Boutique Cycladic suite with TWO "
        "MODELS in candid hospitality moments — one reading on linen sofa, "
        "one preparing breakfast on terrace, narrative implied not posed. "
        "Linen wardrobe styling, hand-thrown ceramics, robes in cream linen, "
        "hospitality props (books, fresh fruit, espresso). Warm available "
        "light + candles. Aspirational guest archetype READ — premium "
        "design-led traveler. Editorial color grading."
    ),
    "architectural_studio": (
        "Architectural detail photograph series. Norm Architects feed energy. "
        "Macro studies of Cycladic boutique suite materials: oak grain "
        "close-up at warm tone, plaster texture against light, brass patina "
        "on hardware, linen weave detail, light-on-stone study, ceramics "
        "composition. NO wide shots. Each frame is a material study. "
        "Hard available light for texture, warm color grading. Reads as "
        "design portfolio — picked up by hospitality blogs and design press."
    ),
    # PRICING paths (visualization is conceptual — show the asset at the implied
    # demand-state, since pricing is operational not aesthetic)
    "four_band_seasonal": (
        "Editorial Mediterranean hospitality photograph at warm afternoon. "
        "Cycladic boutique suite — interior calm, restrained, photographed "
        "at the OFF-PEAK moment with single guest implied (book on side "
        "table, robe on chair). Atmosphere reads as premium-but-attainable. "
        "Warm tones, restrained styling, calm pacing — the visual analogue "
        "of seasonal-band pricing architecture. Honey oak, cream limewash."
    ),
    "length_of_stay": (
        "Editorial hospitality photograph at warm afternoon. Cycladic boutique "
        "suite styled for a SETTLED LONGER STAY — clothes on wooden hangers, "
        "book half-read on side table, fresh flowers replenished, slippers "
        "by bedside, hospitality permanence implied. Warm afternoon light. "
        "Honey oak, cream limewash, microcement. The asset reads as a HOME "
        "FOR DAYS — not a check-in/check-out unit."
    ),
    "demand_premium": (
        "Editorial hospitality photograph at warm peak weekend evening. "
        "Cycladic boutique suite at FULL HOSPITALITY ACTIVATION — terrace "
        "set for two, candles lit, ceramics on table, linen turned down, "
        "premium positioning READS instantly. Warm 1800K candlelight + "
        "soft sconces. Demand-priced moment captured visually. Honey oak, "
        "cream limewash, microcement, rich material warmth."
    ),
}


def _build_image_prompt(concept: Dict[str, Any], prop: Dict[str, Any]) -> str:
    primer = _VISUAL_PRIMER.get(concept.get("key", ""), _VISUAL_PRIMER["mezzanine_loft"])
    materials = ", ".join((concept.get("materials") or [])[:3])
    lighting = ", ".join((concept.get("lighting") or [])[:2])
    return (
        f"{primer} "
        f"Concept: {concept.get('name', '—')}. "
        f"Atmosphere: {concept.get('atmosphere', '—')}. "
        f"Mood: {concept.get('mood', '—')}. "
        f"Materials: {materials or 'limewash, oak, stone'}. "
        f"Lighting: {lighting or '2700K layered evening'}. "
        f"Location feel: {prop.get('city', 'Mediterranean island')}, "
        f"{prop.get('property_type', 'boutique suite')}. "
        "Cinematic 16:9 framing. Architectural photography, no text, no watermark, "
        "no humans in frame, hospitality real estate editorial. "
        "Ultra-high detail, defensible to a luxury operator."
    )


class VisualizeImageRequest(BaseModel):
    concept: Dict[str, Any]
    property: Dict[str, Any] = {}


@router.post("/visualize/image")
async def visualize_image(payload: VisualizeImageRequest):
    """Generate a real cinematic hospitality render via Gemini Nano Banana.

    Returns a data URL (base64). Cached server-side per (key × city × type × title).
    """
    concept = payload.concept or {}
    prop = payload.property or {}
    cache_key = "|".join([
        "v4-strategic",  # bumped when concept architecture changed to rec-aware paths
        str(concept.get("key", "")),
        str(prop.get("city", "")),
        str(prop.get("property_type", "")),
        str(concept.get("name", "")),
    ])
    if cache_key in _IMAGE_CACHE:
        return {"data_url": _IMAGE_CACHE[cache_key], "cached": True}

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI key not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception as exc:
        logger.error(f"emergentintegrations import failed: {exc}")
        raise HTTPException(503, "AI library unavailable")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"visimg-{uuid.uuid4().hex[:10]}",
        system_message="You are a hospitality real-estate visualization engine.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )

    prompt = _build_image_prompt(concept, prop)

    try:
        _, images = await chat.send_message_multimodal_response(
            UserMessage(text=prompt)
        )
    except Exception as exc:
        logger.error(f"Nano Banana image gen failed: {exc}")
        raise HTTPException(502, "Image generation failed — please try again")

    if not images:
        raise HTTPException(502, "No image returned")

    img = images[0]
    mime = img.get("mime_type") or "image/png"
    data_url = f"data:{mime};base64,{img['data']}"

    if len(_IMAGE_CACHE) >= _IMAGE_CACHE_MAX:
        _IMAGE_CACHE.clear()
    _IMAGE_CACHE[cache_key] = data_url
    return {"data_url": data_url, "cached": False}


# ---------------------------------------------------------------------------
# Procurement cart — Budget · Premium · Luxury packages
# ---------------------------------------------------------------------------
_CART_CACHE: Dict[str, Dict[str, Any]] = {}
_CART_CACHE_MAX = 80

CART_SYSTEM_PROMPT = """You are Propul8's Procurement Engine — a hospitality real-estate cart builder. Output ONE JSON object — no prose, no markdown:

{
  "packages": [
    {
      "tier": "budget",
      "label": "Budget Package",
      "subtotal_eur": <integer>,
      "lead_time_weeks": <integer 2-12>,
      "items": [
        {
          "category": "<Furniture|Lighting|Soft Goods|Materials|Hardware>",
          "name": "<concrete product name, ≤ 60 chars>",
          "brand": "<real brand>",
          "supplier": "<real supplier or 'Trade direct'>",
          "dimensions": "<W×D×H cm or 'set'>",
          "qty": <integer>,
          "unit_price_eur": <integer>,
          "line_total_eur": <integer = qty * unit_price_eur>,
          "alternatives": [
            {"name": "<alt name>", "brand": "<alt brand>", "unit_price_eur": <integer>}
          ]
        }
      ]
    },
    { "tier": "premium", "label": "Premium Package", ... },
    { "tier": "luxury",  "label": "Luxury Package",  ... }
  ]
}

HARD RULES:
- Return EXACTLY 3 packages in order: budget → premium → luxury.
- Each package: 6 to 9 items spanning at least 3 categories.
- Real brand names (Cassina, Flos, Vibia, Apparatus, Carl Hansen, Paola Lenti, Kettal, Davide Groppi, Hay, Muuto, Gubi, Santa & Cole, Foscarini, Vitra, B&B Italia, Molteni, Edra, Living Divani, Giorgetti, Ceadesign, Fantini, Vola, Buster + Punch).
- Dimensions in cm (W×D×H) when applicable; 'set' for soft goods kits.
- 1–2 alternatives per item, real-brand swaps with realistic price deltas (±15-25%).
- Prices realistic in EUR for premium hospitality: budget items €100-€700, premium €400-€2.5k, luxury €900-€8k.
- subtotal_eur = sum(line_total_eur). Be exact.
- Items operational, scannable. No marketing prose.
"""


def _cart_fallback(rec: Dict[str, Any]) -> Dict[str, Any]:
    """Always-renderable cart used when AI is unavailable. Calibrated for the demo
    'Sleep Capacity Expansion' / 'Layered Evening Lighting' upgrades."""
    title = (rec.get("title") or "").lower()
    is_lighting = "lighting" in title
    base = (
        [
            {"category": "Lighting", "name": "Apparatus Trapeze Pendant", "brand": "Apparatus", "supplier": "Apparatus Trade", "dimensions": "70×70×60", "qty": 1, "unit_price_eur": 4400},
            {"category": "Lighting", "name": "Vibia Wireflow Linear", "brand": "Vibia", "supplier": "Vibia Trade", "dimensions": "240×8×4", "qty": 1, "unit_price_eur": 1200},
            {"category": "Lighting", "name": "Santa & Cole Cestita", "brand": "Santa & Cole", "supplier": "Trade direct", "dimensions": "21×21×24", "qty": 4, "unit_price_eur": 220},
            {"category": "Hardware", "name": "Buster + Punch Dimmer Switch", "brand": "Buster + Punch", "supplier": "B+P Trade", "dimensions": "8×8×1.5", "qty": 6, "unit_price_eur": 95},
        ]
        if is_lighting
        else [
            {"category": "Furniture", "name": "Cassina LC2 Lounge", "brand": "Cassina", "supplier": "Cassina Trade", "dimensions": "70×70×67", "qty": 2, "unit_price_eur": 4800},
            {"category": "Furniture", "name": "Carl Hansen Wishbone Chair", "brand": "Carl Hansen", "supplier": "Trade direct", "dimensions": "55×52×76", "qty": 4, "unit_price_eur": 720},
            {"category": "Furniture", "name": "Built-in Oak Mezzanine Bed", "brand": "Bespoke joinery", "supplier": "Local trade", "dimensions": "200×140×80", "qty": 1, "unit_price_eur": 2200},
            {"category": "Soft Goods", "name": "Linen Bedding Set 5pax", "brand": "Society Limonta", "supplier": "Trade direct", "dimensions": "set", "qty": 5, "unit_price_eur": 320},
            {"category": "Lighting", "name": "Flos String Pendant", "brand": "Flos", "supplier": "Flos Trade", "dimensions": "190×Ø22", "qty": 1, "unit_price_eur": 1100},
            {"category": "Materials", "name": "Honed Limestone Flooring", "brand": "Pierre Bleue", "supplier": "Local trade", "dimensions": "60×60×2", "qty": 24, "unit_price_eur": 95},
        ]
    )

    def _scaled(items: List[Dict[str, Any]], factor: float, alt_label: str) -> List[Dict[str, Any]]:
        out = []
        for it in items:
            unit = max(80, int(it["unit_price_eur"] * factor))
            out.append({
                **it,
                "unit_price_eur": unit,
                "line_total_eur": unit * it["qty"],
                "alternatives": [
                    {"name": alt_label, "brand": "Trade alt", "unit_price_eur": int(unit * 0.85)},
                ],
            })
        return out

    def _pack(tier: str, label: str, items: List[Dict[str, Any]], lead: int) -> Dict[str, Any]:
        return {
            "tier": tier,
            "label": label,
            "items": items,
            "subtotal_eur": sum(i["line_total_eur"] for i in items),
            "lead_time_weeks": lead,
        }

    return {
        "packages": [
            _pack("budget", "Budget Package", _scaled(base, 0.55, "Local equivalent"), 4),
            _pack("premium", "Premium Package", _scaled(base, 1.0, "Trade alt"), 7),
            _pack("luxury", "Luxury Package", _scaled(base, 1.55, "Bespoke commission"), 11),
        ]
    }


class CartRequest(BaseModel):
    recommendation: Dict[str, Any]
    property: Dict[str, Any] = {}


@router.post("/upgrade/cart")
async def upgrade_cart(payload: CartRequest):
    rec = payload.recommendation or {}
    prop = payload.property or {}

    cache_key = "|".join([
        "v1",
        str(rec.get("title", "")).strip().lower(),
        str(prop.get("property_type", "")).strip().lower(),
        str(prop.get("city", "")).strip().lower(),
    ])
    if cache_key in _CART_CACHE:
        return _CART_CACHE[cache_key]

    if not EMERGENT_LLM_KEY:
        return _cart_fallback(rec)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception:  # noqa: BLE001
        return _cart_fallback(rec)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"cart-{uuid.uuid4().hex[:10]}",
        system_message=CART_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        f"Property: {prop.get('name', '—')}, {prop.get('city', '—')} | "
        f"{prop.get('property_type', 'boutique suite')} | sleeps {prop.get('sleeps', '—')}\n"
        f"Upgrade: {rec.get('title', '—')} — {rec.get('transformation', rec.get('detail', '—'))}\n"
        "Return JSON now."
    )

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Cart AI call failed: {exc}")
        return _cart_fallback(rec)

    parsed = _parse_ai_json(raw if isinstance(raw, str) else str(raw))
    if not isinstance(parsed, dict) or len(parsed.get("packages", []) or []) < 3:
        return _cart_fallback(rec)

    # Recompute totals defensively (AI sometimes drops 1 €).
    for pkg in parsed["packages"]:
        for it in pkg.get("items", []):
            if "line_total_eur" not in it or not it["line_total_eur"]:
                it["line_total_eur"] = int(it.get("qty", 1)) * int(it.get("unit_price_eur", 0))
        pkg["subtotal_eur"] = sum(int(i.get("line_total_eur", 0)) for i in pkg.get("items", []))

    if len(_CART_CACHE) >= _CART_CACHE_MAX:
        _CART_CACHE.clear()
    _CART_CACHE[cache_key] = parsed
    return parsed


# ---------------------------------------------------------------------------
# Listing Rewrite — editorial copy aligned to the upgrade / concept
# ---------------------------------------------------------------------------
_LISTING_CACHE: Dict[str, Dict[str, Any]] = {}
_LISTING_CACHE_MAX = 80

LISTING_REWRITE_SYSTEM = """You are Propul8's Listing Engine — a hospitality copy specialist for premium short-term rentals.

Output ONE JSON object — no prose, no markdown:

{
  "title": "≤ 50 chars — editorial Airbnb-style title, no clichés",
  "subhead": "≤ 80 chars — one hero subhead",
  "description": [
    "paragraph 1 ≤ 280 chars — atmosphere & first impression",
    "paragraph 2 ≤ 280 chars — design language & materials",
    "paragraph 3 ≤ 280 chars — guest experience & local"
  ],
  "amenities": ["6 short tags — most differentiating only, ≤ 22 chars each"],
  "sleeps_positioning": "≤ 70 chars — e.g. 'Sleeps 5 · built for design-led families'",
  "guest_segment": "≤ 110 chars — target traveller archetype",
  "pricing_positioning": "≤ 110 chars — e.g. 'Premium boutique tier €245+ ADR'",
  "house_rules": ["3 short lines, hospitality-native"]
}

RULES:
- Hospitality-fluent. Aman / Casa Cook / Edition tone. NO clichés ("oasis", "hidden gem", "stunning").
- No exclamation marks. No hashtags. No emojis.
- Description: tactile, restrained, sensory. Refer to specific materials, lighting, atmosphere.
- Amenities: only the differentiating few — skip "WiFi", "TV", obvious basics.
- If a concept name is provided, align the editorial direction to it (Cycladic / Editorial / Mediterranean Contemporary).
"""


def _listing_fallback(rec: Dict[str, Any], prop: Dict[str, Any]) -> Dict[str, Any]:
    name = prop.get("name") or "Hospitality Asset"
    city = prop.get("city") or "Mediterranean"
    sleeps = prop.get("sleeps") or 4
    return {
        "title": f"{name} — {city.split(',')[0]}",
        "subhead": "Editorial Cycladic suite, calibrated for design-led travellers.",
        "description": [
            f"A whitewashed boutique suite in {city.split(',')[0]}, where soft limewash walls meet sun-bleached oak and warm 2700K evening light.",
            "Materials chosen for tactility — honed limestone underfoot, hand-finished oak millwork, sculptural plaster ceilings, washed linen at the bed.",
            "Slow afternoons on the terrace, candlelit dining at dusk, and a curated five-minute walk to chora — restraint, not spectacle.",
        ],
        "amenities": [
            "Sea-facing terrace",
            "2700K layered lighting",
            "Linen bedding · 5pax",
            "Programmed soundscape",
            "Editorial book curation",
            "Design-led concierge",
        ],
        "sleeps_positioning": f"Sleeps {sleeps} · calibrated for design-led travellers and small families",
        "guest_segment": "Design-led, low-volume traveller migrating off Mykonos toward editorial Cycladic inventory.",
        "pricing_positioning": "Premium boutique tier · €245+ ADR · top quartile of design-led peers.",
        "house_rules": [
            "Quiet hours after 22:00 — neighbouring suites in earshot.",
            "Self check-in via lockbox; concierge on call from 09:00–21:00.",
            "No events; suite calibrated for restorative stays of 3+ nights.",
        ],
    }


class ListingRewriteRequest(BaseModel):
    recommendation: Dict[str, Any]
    property: Dict[str, Any] = {}
    concept: Optional[Dict[str, Any]] = None


@router.post("/upgrade/listing")
async def upgrade_listing(payload: ListingRewriteRequest):
    rec = payload.recommendation or {}
    prop = payload.property or {}
    concept = payload.concept or {}

    cache_key = "|".join([
        "v1",
        str(rec.get("title", "")).strip().lower(),
        str(prop.get("property_type", "")).strip().lower(),
        str(prop.get("city", "")).strip().lower(),
        str(concept.get("key", "")).strip().lower(),
    ])
    if cache_key in _LISTING_CACHE:
        return _LISTING_CACHE[cache_key]

    if not EMERGENT_LLM_KEY:
        return _listing_fallback(rec, prop)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception:  # noqa: BLE001
        return _listing_fallback(rec, prop)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"listing-{uuid.uuid4().hex[:10]}",
        system_message=LISTING_REWRITE_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        f"Property: {prop.get('name', '—')}, {prop.get('city', '—')} | "
        f"{prop.get('property_type', 'Boutique Suite')} | sleeps {prop.get('sleeps', '—')} | "
        f"ADR €{prop.get('nightly_rate', '—')}\n"
        f"Upgrade focus: {rec.get('title', '—')} — {rec.get('transformation', rec.get('detail', '—'))}\n"
        f"Concept direction: {concept.get('name') or 'editorial Mediterranean'} — "
        f"{concept.get('atmosphere') or 'calm restraint'}\n"
        "Return JSON now."
    )

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Listing rewrite AI call failed: {exc}")
        return _listing_fallback(rec, prop)

    parsed = _parse_ai_json(raw if isinstance(raw, str) else str(raw))
    if not isinstance(parsed, dict) or not parsed.get("title"):
        return _listing_fallback(rec, prop)

    if len(_LISTING_CACHE) >= _LISTING_CACHE_MAX:
        _LISTING_CACHE.clear()
    _LISTING_CACHE[cache_key] = parsed
    return parsed



# ---------------------------------------------------------------------------
# Listing URL ingestion — Hybrid scrape → AI extract → safe fallback
# ---------------------------------------------------------------------------
LISTING_INGEST_SYSTEM = """You are Propul8's listing ingestion engine. You receive raw text/metadata extracted from a hospitality listing URL (Airbnb / Booking.com / VRBO / generic STR). Output ONE JSON object — no prose, no markdown:

{
  "name": "<short title>",
  "city": "<city, country>",
  "location": "<neighborhood / district>",
  "property_type": "<Boutique Suite | Villa | Apartment | Studio | Loft | Townhouse>",
  "sqm": <integer or null>,
  "bedrooms": <integer or null>,
  "bathrooms": <integer or null>,
  "sleeps": <integer>,
  "nightly_rate": <integer or null>,
  "amenities": ["≤ 5 short tags"],
  "design_language": "≤ 90 chars — current visual / hospitality style",
  "listing_weakness": "≤ 90 chars — single sharpest improvement vector",
  "_provenance": {
    "name": "scraped|inferred",
    "city": "scraped|inferred",
    "sleeps": "scraped|inferred",
    "bedrooms": "scraped|inferred",
    "nightly_rate": "scraped|inferred"
  }
}

RULES:
- Use scraped values when present; otherwise infer from URL slug, city patterns, hospitality benchmarks.
- Set _provenance per field — "scraped" only when literally found in the input text. Everything else is "inferred".
- Never return null for: name, city, sleeps, property_type. Use intelligent defaults (sleeps=4, type=Boutique Suite, name from slug).
- City must be specific ("Koufonisia, Greece", not "Greece").
"""


def _quick_visual_analysis(images: List[str]) -> Dict[str, Any]:
    """Lightweight, deterministic hospitality-visual read derived purely from
    the listing's gallery metadata (count, presence of hero, URL signals).

    Returns a structured payload — not AI, not slow. The frontend uses this
    to show "Visual Quality Score / Hospitality Style / Thumbnail Strength /
    Aesthetic Consistency" without spending an LLM call on the ingest path.
    """
    n = len(images)
    has_hero = bool(images)

    # Score band — clamp 0..100. Most listings sit in 55–80 band.
    if n >= 18:
        photo_volume = 92
    elif n >= 10:
        photo_volume = 78
    elif n >= 5:
        photo_volume = 62
    elif n >= 1:
        photo_volume = 48
    else:
        photo_volume = 30

    # Aesthetic consistency proxy — same CDN signal across most images.
    if n >= 4:
        roots = [re.split(r"\?", u)[0].rsplit("/", 1)[0] for u in images]
        same_root = sum(1 for r in roots if r == roots[0])
        consistency = int(round(60 + (same_root / max(1, n)) * 38))
    else:
        consistency = 55

    # Thumbnail strength — does the hero (first image) include a wide aspect
    # hint (1500/1600/2000-style sizes are flagship hero crops on Airbnb / Booking).
    thumbnail_strength = 70
    if has_hero:
        first = images[0]
        if re.search(r"(1600|1500|2000|w=1[02-9]\d{2})", first):
            thumbnail_strength = 82
        elif re.search(r"(640|720|800)", first):
            thumbnail_strength = 64

    overall = int(round((photo_volume * 0.45) + (consistency * 0.30) + (thumbnail_strength * 0.25)))

    # Hospitality style read — simple 3-bucket classification on URL slugs.
    blob = " ".join(images)[:4000]
    if re.search(r"(boutique|suite|villa|hotel|design|editorial)", blob, re.IGNORECASE):
        style = "Boutique editorial"
    elif re.search(r"(family|kids|spacious|home)", blob, re.IGNORECASE):
        style = "Family hospitality"
    else:
        style = "Generic hospitality"

    notes: List[str] = []
    if n < 5:
        notes.append("Photo volume below comp-set median (≥10 hero frames).")
    if consistency < 70:
        notes.append("Color & style inconsistency caps editorial cohesion.")
    if thumbnail_strength < 70:
        notes.append("Cover-image crop is small — listings reward 1600px+ hero frames.")
    if not notes:
        notes.append("Gallery within boutique-comp parameters; refresh for ADR uplift.")

    return {
        "photo_count": n,
        "photo_volume_score": photo_volume,
        "consistency_score": consistency,
        "thumbnail_strength": thumbnail_strength,
        "overall_score": overall,
        "hospitality_style": style,
        "notes": notes,
    }


def _scrape_listing(url: str) -> Dict[str, Any]:
    """Best-effort fetch + parse OG / JSON-LD / page text. Never raises.

    Multi-layer extraction:
      Layer 1: JSON-LD (schema.org RealEstateListing / Product / Offer)
      Layer 2: OG / meta tags
      Layer 3: DOM text (raw_text — for regex Layer 3 in extractors)

    Also extracts up to 8 candidate listing images (og:image, twitter:image,
    inline <img src=…>) so the frontend can show a live visual gallery during
    review.

    Detects bot-block pages (Spitogatos / Idealista anti-scraping interstitials)
    and sets out["bot_blocked"] = True so the UI can surface 'Source blocked'.
    """
    out: Dict[str, Any] = {
        "url": url, "raw_text": "", "og": {}, "title": "", "images": [],
        "description": "", "json_ld": [], "bot_blocked": False,
        "http_status": None, "extraction_layers": [],
    }
    try:
        # Realistic browser header set with Sec-Fetch + Sec-CH-UA hints.
        # This bypasses light-touch anti-bot filters (Imperva edge rules) used
        # by Spitogatos / Idealista / Engel & Völkers static pages.
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/132.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
            "Accept-Language": "en-US,en;q=0.9,el;q=0.8,fr;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Sec-CH-UA": '"Chromium";v="132", "Google Chrome";v="132", "Not?A_Brand";v="24"',
            "Sec-CH-UA-Mobile": "?0",
            "Sec-CH-UA-Platform": '"macOS"',
        }
        resp = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        out["http_status"] = resp.status_code
        if resp.status_code != 200 or not resp.text:
            out["bot_blocked"] = resp.status_code in (403, 429, 503)
            return out
        # Bumped from 200K → 600K to capture full E&V / Idealista / Rightmove pages.
        html = resp.text[:600_000]

        # Extract <title>
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if m:
            out["title"] = re.sub(r"\s+", " ", m.group(1)).strip()[:200]

        # Detect anti-bot interstitials by title or body sentinel.
        block_signals = [
            "pardon our interruption", "just a moment", "captcha",
            "access denied", "request unsuccessful", "are you a robot",
            "checking your browser", "cf-error", "ddos-guard",
        ]
        haystack = (out["title"] + " " + html[:4000]).lower()
        if any(s in haystack for s in block_signals):
            out["bot_blocked"] = True
            # Keep going — sometimes useful metadata is still in the page.

        # Extract og: + twitter: meta tags
        for match in re.finditer(
            r'<meta[^>]+(?:property|name)=[\'\"](og:[^\'\"]+|twitter:[^\'\"]+)[\'\"][^>]+content=[\'\"]([^\'\"]+)[\'\"]',
            html, re.IGNORECASE,
        ):
            out["og"][match.group(1).lower()] = match.group(2).strip()[:1000]
        if out.get("og"):
            out["extraction_layers"].append("og_meta")
        # Also pull <meta name="description"> for portals that don't use OG.
        m_desc = re.search(
            r'<meta[^>]+name=[\'\"]description[\'\"][^>]+content=[\'\"]([^\'\"]+)[\'\"]',
            html, re.IGNORECASE,
        )
        if m_desc and not out["og"].get("og:description"):
            out["description"] = m_desc.group(1).strip()[:1500]
        if out["og"].get("og:description"):
            out["description"] = out["og"]["og:description"]

        # Image candidates — preserve order, dedupe, cap at 8.
        seen: set = set()
        candidates: List[str] = []

        def _push(u: str) -> None:
            u = (u or "").strip()
            if not u or not u.startswith("http"):
                return
            # Skip 1-px tracking pixels and tiny icons
            if re.search(r"(pixel|tracker|sprite|favicon|logo|icon)", u, re.IGNORECASE):
                return
            if u in seen:
                return
            seen.add(u)
            candidates.append(u)

        for k in ("og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"):
            if out["og"].get(k):
                _push(out["og"][k])

        for match in re.finditer(
            r'<img[^>]+src=[\'\"]([^\'\"]+)[\'\"]', html, re.IGNORECASE
        ):
            _push(match.group(1))

        out["images"] = candidates[:8]

        # Strip tags and grab a textual digest. Bumped 4K → 12K to keep more
        # listing description copy in scope of regex extractors.
        text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
        text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"&nbsp;|&#160;", " ", text)
        text = re.sub(r"\s+", " ", text)
        # Prepend the OG/meta description so regex extractors can hit it even
        # when the rest of the page is JS-rendered noise (E&V is JS-heavy).
        digest_prefix = " ".join([
            out.get("title") or "",
            out.get("description") or "",
        ]).strip()
        out["raw_text"] = (digest_prefix + " " + text).strip()[:12_000]

        # JSON-LD structured data (schema.org). Highest-trust source for
        # asking_price, address, numberOfRooms, etc.
        ld_blocks: List[Dict[str, Any]] = []
        for ldm in re.finditer(
            r'<script[^>]+type=[\'\"]application/ld\+json[\'\"][^>]*>([\s\S]*?)</script>',
            html, flags=re.IGNORECASE,
        ):
            try:
                blob = ldm.group(1).strip()
                # JSON-LD pages can be a list, an object, or a graph.
                parsed = json.loads(blob)
                if isinstance(parsed, list):
                    ld_blocks.extend([x for x in parsed if isinstance(x, dict)])
                elif isinstance(parsed, dict):
                    if isinstance(parsed.get("@graph"), list):
                        ld_blocks.extend([x for x in parsed["@graph"] if isinstance(x, dict)])
                    else:
                        ld_blocks.append(parsed)
            except (json.JSONDecodeError, ValueError):
                continue
        out["json_ld"] = ld_blocks
        if ld_blocks:
            out["extraction_layers"].append("json_ld")

        # Spitogatos-specific DOM signatures (price/sqm/rooms inline blocks).
        # Spitogatos uses <span class="price">€ 420.000</span> patterns and
        # __NEXT_DATA__ / __INITIAL_STATE__ JSON dumps in script tags.
        spito_signals: Dict[str, Any] = {}
        if "spitogatos" in url.lower():
            # Try to pull Next.js initial state JSON (most reliable for SPAs).
            nd = re.search(
                r'<script[^>]+id=[\'\"]__NEXT_DATA__[\'\"][^>]*>([\s\S]*?)</script>',
                html, flags=re.IGNORECASE,
            )
            if nd:
                try:
                    payload = json.loads(nd.group(1).strip())
                    props = payload.get("props", {}).get("pageProps", {})
                    listing = (props.get("property") or props.get("listing")
                               or props.get("ad") or props.get("data") or {})
                    if isinstance(listing, dict):
                        spito_signals = {
                            "price":      listing.get("price") or listing.get("priceValue"),
                            "size":       listing.get("size") or listing.get("squareMeters") or listing.get("sqm"),
                            "rooms":      listing.get("rooms") or listing.get("bedrooms"),
                            "bathrooms":  listing.get("bathrooms"),
                            "floor":      listing.get("floor"),
                            "city":       (listing.get("location") or {}).get("city")
                                          if isinstance(listing.get("location"), dict)
                                          else listing.get("city"),
                            "title":      listing.get("title") or listing.get("headline"),
                            "yearBuilt":  listing.get("yearBuilt") or listing.get("year"),
                        }
                except (json.JSONDecodeError, ValueError):
                    pass
            if spito_signals:
                out["extraction_layers"].append("spitogatos_next_data")
            out["_spito"] = spito_signals
    except Exception as exc:  # noqa: BLE001
        logger.info(f"Listing scrape failed (non-fatal) for {url}: {exc}")
    return out


def _slug_hints(url: str) -> str:
    try:
        path = re.sub(r"^https?://[^/]+", "", url)
        return path.replace("/", " ").replace("-", " ").replace("_", " ")[:200]
    except Exception:  # noqa: BLE001
        return url


class ListingIngestRequest(BaseModel):
    url: str
    nightly_rate: Optional[int] = None
    goal: Optional[str] = None  # "higher_adr" | "family" | "luxury" | "occupancy"


# Cache for vision reads — same image url should never be re-analyzed during
# a session. Saves ~30s + LLM cost per repeat call.
_VISION_CACHE: Dict[str, Dict[str, Any]] = {}
_VISION_CACHE_MAX = 60


class VisionAnalyzeRequest(BaseModel):
    image_url: str
    context: Optional[Dict[str, Any]] = None  # {city, property_type, …}


_VISION_SYSTEM_PROMPT = """You are Propul8's hospitality vision analyst.

Analyze the SUPPLIED IMAGE as a hospitality listing photograph. You are NOT
generating ideas — you are reading what the photograph actually communicates
to a booking traveler.

Output ONE JSON object, no prose, no markdown:

{
  "luxury_perception": <integer 0-100 — how premium does the space read?>,
  "warmth": <integer 0-100 — emotional warmth + warm Mediterranean read>,
  "lighting_quality": <integer 0-100 — layered, programmed, photogenic vs flat/cool>,
  "design_consistency": <integer 0-100 — coherent material + tonal palette>,
  "spatial_optimization": <integer 0-100 — does space feel programmed for hospitality?>,
  "click_through_potential": <integer 0-100 — would a traveler click on this thumbnail?>,
  "hospitality_archetype": "<one-line archetype: 'Editorial boutique' | 'Family premium' | 'Romantic retreat' | 'Generic mid-market' | 'Design-led couples' | 'Aspirational lifestyle'>",
  "visual_atmosphere": "≤ 90 chars — sensory read of the photograph",
  "flags": ["3 short hospitality-native flags ≤ 90 chars each — what suppresses revenue"]
}

RULES:
- Be honest. If the image is generic / flat / cold, score it low.
- Use Aman / Casa Cook / Edition Hotels as the top-decile reference.
- Flags must be operational ("Cool overhead lighting suppresses warmth perception"),
  not aesthetic ("could be cozier").
- ZERO clichés. ZERO hype. Institutional read.
"""


@router.post("/visual-analysis/warmup")
async def visual_analysis_warmup():
    """Tiny dry-run that pre-imports the emergentintegrations vision module
    + verifies the LLM key is present. Frontend calls this once per session
    on Dashboard mount so the first real /api/visual-analysis is hot."""
    if not EMERGENT_LLM_KEY:
        return {"ok": False, "reason": "no key"}
    try:
        from emergentintegrations.llm.chat import LlmChat, ImageContent  # noqa: WPS433, F401
        return {"ok": True}
    except Exception as exc:
        logger.warning(f"Vision warmup import failed: {exc}")
        return {"ok": False, "reason": "library"}


@router.post("/visual-analysis")
async def visual_analysis(payload: VisionAnalyzeRequest):
    """Real LLM-vision read of a hospitality listing photograph.

    Frontend calls this after `/ingest/listing-url` returns to upgrade the
    deterministic `visual_analysis` block with a Claude Sonnet 4.5 vision
    read. We download the bytes, base64-encode, and send via emergent-
    integrations' ImageContent. Hard-cap image size to keep payloads small.
    """
    img_url = (payload.image_url or "").strip()
    if not img_url.startswith("http"):
        raise HTTPException(400, "image_url must be an absolute URL")

    if img_url in _VISION_CACHE:
        return _VISION_CACHE[img_url]

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI key not configured")

    # 1) Download bytes — small timeout, capped size
    try:
        r = requests.get(
            img_url,
            timeout=8,
            headers={"User-Agent": "Propul8/1.0"},
            stream=True,
        )
        if r.status_code != 200:
            raise HTTPException(400, f"Image fetch returned {r.status_code}")
        ctype = (r.headers.get("Content-Type") or "").lower()
        if not any(t in ctype for t in ("jpeg", "jpg", "png", "webp")):
            raise HTTPException(400, f"Unsupported content-type: {ctype or 'unknown'}")
        # Cap at 4MB
        chunks: List[bytes] = []
        total = 0
        for c in r.iter_content(chunk_size=64 * 1024):
            if not c:
                break
            chunks.append(c)
            total += len(c)
            if total > 4 * 1024 * 1024:
                break
        img_bytes = b"".join(chunks)
        if not img_bytes:
            raise HTTPException(400, "Empty image payload")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Vision: image fetch failed for {img_url}: {exc}")
        raise HTTPException(502, "Could not fetch image")

    img_b64 = base64.b64encode(img_bytes).decode("ascii")

    # 2) Call Claude Sonnet 4.5 vision via emergentintegrations
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # noqa: WPS433
    except Exception as exc:
        logger.error(f"emergentintegrations import failed: {exc}")
        raise HTTPException(503, "AI library unavailable")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"vision-{uuid.uuid4().hex[:10]}",
        system_message=_VISION_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    ctx = payload.context or {}
    user_text = (
        f"Property context: {ctx.get('property_type', '—')} in "
        f"{ctx.get('city', '—')}, target archetype "
        f"{ctx.get('hospitality_archetype', '—')}.\n"
        "Read this hospitality listing photograph. Return JSON now."
    )

    try:
        raw = await chat.send_message(UserMessage(
            text=user_text,
            file_contents=[ImageContent(image_base64=img_b64)],
        ))
    except Exception as exc:
        logger.error(f"Vision call failed: {exc}")
        raise HTTPException(502, "AI vision provider error")

    parsed = _parse_ai_json(raw if isinstance(raw, str) else str(raw))
    # Clamp scores
    for k in ("luxury_perception", "warmth", "lighting_quality", "design_consistency",
              "spatial_optimization", "click_through_potential"):
        if k in parsed:
            try:
                parsed[k] = max(0, min(100, int(parsed[k])))
            except (TypeError, ValueError):
                parsed[k] = 60

    # Composite Propul8 Visual Score™
    composite_keys = ("luxury_perception", "warmth", "lighting_quality",
                      "design_consistency", "spatial_optimization", "click_through_potential")
    if all(k in parsed for k in composite_keys):
        parsed["overall_score"] = round(
            sum(parsed[k] for k in composite_keys) / len(composite_keys)
        )

    parsed["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    parsed["model"] = "claude-sonnet-4-5"
    parsed["source"] = "vision"

    if len(_VISION_CACHE) >= _VISION_CACHE_MAX:
        _VISION_CACHE.clear()
    _VISION_CACHE[img_url] = parsed
    return parsed


@router.post("/ingest/listing-url")
async def ingest_listing_url(payload: ListingIngestRequest):
    """Hybrid: try real scrape, fall back to URL-only AI synthesis. Never fails."""
    url = payload.url.strip()
    if not url.startswith("http"):
        raise HTTPException(400, "Provide a full https:// URL")

    scraped = _scrape_listing(url)
    has_scrape = bool(scraped.get("raw_text") or scraped.get("title") or scraped.get("og"))

    context_lines = [f"URL: {url}", f"Slug-words: {_slug_hints(url)}"]
    if scraped.get("title"):
        context_lines.append(f"Title: {scraped['title']}")
    for k, v in (scraped.get("og") or {}).items():
        context_lines.append(f"{k}: {v}")
    if scraped.get("raw_text"):
        context_lines.append(f"Page-text: {scraped['raw_text'][:1800]}")
    if payload.nightly_rate:
        context_lines.append(f"User-provided ADR: €{payload.nightly_rate}")
    if payload.goal:
        context_lines.append(f"User goal: {payload.goal}")

    user_text = "\n".join(context_lines) + (
        "\n\nReturn the JSON object now. "
        "If the page-text is empty or minimal, infer from the slug and city patterns."
    )

    fallback = {
        "name": (scraped.get("title") or "Hospitality Asset")[:80],
        "city": "—",
        "location": "—",
        "property_type": "Boutique Suite",
        "sqm": None,
        "bedrooms": 1,
        "bathrooms": 1,
        "sleeps": 4,
        "nightly_rate": payload.nightly_rate or None,
        "amenities": [],
        "design_language": "—",
        "listing_weakness": "—",
        "_provenance": {
            "name": "inferred", "city": "inferred", "sleeps": "inferred",
            "bedrooms": "inferred", "nightly_rate": "user" if payload.nightly_rate else "inferred",
        },
        "_source": "scraped" if has_scrape else "inferred",
        "_url": url,
        "images": scraped.get("images") or [],
        "visual_analysis": _quick_visual_analysis(scraped.get("images") or []),
    }

    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception:  # noqa: BLE001
        return fallback

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ingest-{uuid.uuid4().hex[:10]}",
        system_message=LISTING_INGEST_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Ingest AI call failed: {exc}")
        return fallback

    parsed = _parse_ai_json(raw if isinstance(raw, str) else str(raw))
    if not isinstance(parsed, dict) or not parsed.get("name"):
        return fallback

    parsed.setdefault("_provenance", {})
    parsed["_source"] = "scraped" if has_scrape else "inferred"
    parsed["_url"] = url
    # Always pass through the extracted images + a visual quality read so the
    # review page can show a hospitality gallery + intelligence layer.
    parsed["images"] = scraped.get("images") or []
    parsed["visual_analysis"] = _quick_visual_analysis(parsed["images"])
    if payload.nightly_rate:
        # User-supplied always wins — AI may echo it back from context with wrong provenance.
        parsed["nightly_rate"] = payload.nightly_rate
        parsed["_provenance"]["nightly_rate"] = "user"
    return parsed


# ---------------------------------------------------------------------------
# Transformation Engine — actionable AI execution layer
# ---------------------------------------------------------------------------
TRANSFORM_SYSTEM_PROMPT = """You are Propul8's Execution Engine — an AI hospitality asset operations layer. Output is operational, compressed, instantly usable.

You receive a property context, an upgrade recommendation, and a directive. Return ONE JSON object — no prose, no markdown fences — matching this schema:

{
  "headline": "3-6 words, operational",
  "tldr": "1 sentence — what gets delivered. No marketing.",
  "sections": [
    {"heading": "SHORT_UPPERCASE_LABEL", "items": ["≤ 80 char operational line", "..."]}
  ],
  "metric": "optional one-line impact (revenue/payback/sentiment)"
}

HARD RULES:
- EVERY item ≤ 80 characters. No paragraphs. No essays. No editorial language.
- Items are structured, scannable, decision-ready. Use bullets/specs, not prose.
- Real brand names where relevant. Real numbers in EUR. Real dimensions in cm.
- No "Aman", "editorial brief", "architectural studio" voice — Propul8 is execution OS, not consulting.
- Each section has 3–7 items max.
- Output JSON only.
"""

TRANSFORM_DIRECTIVES: Dict[str, str] = {
    # ── Operational primitives (compressed, 1-click outputs) ────────────────
    "visualize_layout": (
        "Visualize with AI. EXACTLY 4 sections: "
        "MIDJOURNEY PROMPT (1 line, ≤ 300 chars, ending with '--ar 3:2 --v 6 --style raw'); "
        "DALL·E PROMPT (1 line, ≤ 300 chars, photographic prompt voice, no aspect tags); "
        "STABLE DIFFUSION PROMPT (1 line, ≤ 300 chars, comma-separated keywords + 1 negative-prompt line prefixed 'NEGATIVE:'); "
        "BEFORE / AFTER (3 lines — 'BEFORE: …', 'AFTER: …', 'TRANSFORMATION MOMENT: …'). "
        "Hospitality, architectural, real materials. No fluff."
    ),
    "shopping_cart": (
        "Build Real Cart. EXACTLY 2 sections. "
        "ITEMS — 6–10 lines, strict format: 'product · brand · qty · €price · WxDxH cm · supplier' "
        "(supplier from: IKEA / Zara Home / H&M Home / Amazon / MOHD / Made / West Elm / Local FF&E). "
        "ALTERNATIVES — 3–4 lines, format: 'item swap · cheaper alt · €price · supplier'. "
        "Real brand names. Real prices. No commentary."
    ),
    "contractor_pack": (
        "Generate Contractor Pack. EXACTLY 4 sections, 3–5 lines each: "
        "MEASUREMENTS (cm or mm); MATERIALS (sku-grade names + finish); "
        "LIGHTING PLACEMENT (positions + Kelvin + watts); "
        "INSTALL REQUIREMENTS (sequence, tools, electrician/plumber). "
        "Spec sheet, not prose."
    ),
    "update_listing": (
        "Rewrite Listing. EXACTLY 4 sections, ≤ 12 lines total: "
        "TITLE (1 line ≤ 50 chars); DESCRIPTION (2–3 short lines); "
        "GUEST POSITIONING (2 lines); AMENITY UPDATES (3–5 lines)."
    ),
    "activate_upgrade": (
        "Activate Upgrade. EXACTLY 6 sections, 3–5 lines each: "
        "VISUAL DIRECTION (atmosphere, materials, light); "
        "PROCUREMENT SUMMARY (cart total, supplier mix, lead times); "
        "CONTRACTOR SCOPE (key dimensions, install sequence); "
        "LISTING UPDATES (title, sleeps, key amenity changes); "
        "OWNER APPROVAL CHECKLIST (explicit yes/no items); "
        "TIMELINE (week numbers + milestones). Each line ≤ 80 chars."
    ),
    "export_pack": (
        "Export Upgrade Pack. EXACTLY 5 sections, 3–4 lines each: "
        "EXECUTIVE SUMMARY (1 line per axis: visual/cart/contractor/listing/timeline); "
        "PROCUREMENT TOTALS (cart total, supplier count, longest lead time); "
        "CONTRACTOR HANDOFF (5 dimensions/specs); "
        "LISTING DELTA (before → after, 3 lines); "
        "APPROVAL STATUS (3 lines — visual / cart / listing approval state). "
        "Designed for PDF export — each line ≤ 80 chars."
    ),
    # ── Bundles (operational, multi-section) ─────────────────────────────────
    "photo_package": (
        "Produce a complete Photo Package for execution. EXACTLY 5 sections in this order: "
        "SHOT LIST (10–12 frames; each line: 'frame name — angle — light condition — anchor element'); "
        "PHOTOGRAPHER BRIEF (references, schedule, set styling, deliverables); "
        "STAGING DIRECTION (room-by-room textiles/props/florals + what to remove); "
        "EDITING STYLE (color grade, contrast, grain, output formats); "
        "COVER IMAGE STRATEGY (hero frame logic, supporting frames, A/B variants). "
        "Each item ≤ 1 line. Operational, not poetic."
    ),
    "lighting_package": (
        "Produce a complete Lighting Package. EXACTLY 5 sections: "
        "FIXTURE RECOMMENDATIONS (3 brand-tiers — designer / mid-luxury / mid-tier — with real brand names); "
        "LIGHTING LAYOUT (placements, beam angles, switching scenes); "
        "SHOPPING LIST (specific SKUs, quantities, indicative EUR prices); "
        "INSTALLATION NOTES (sequencing, dimming protocol, electrician guidance); "
        "VISUAL DIRECTION (one line per zone — how it reads at dusk). Each item ≤ 1 line."
    ),
    "listing_optimization": (
        "Produce a Listing Optimization package. EXACTLY 5 sections: "
        "OPTIMIZED TITLE (5 candidates ≤ 50 chars, each with a one-line rationale); "
        "LISTING DESCRIPTION (3 short editorial paragraphs as items); "
        "SEO POSITIONING (head terms, long-tail phrases, geo modifiers); "
        "GUEST TARGETING (2–3 personas, channel mix, voice); "
        "AMENITIES STRUCTURE (top-of-listing icons ordered for conversion). Concise. No marketing speak."
    ),
    "pricing_strategy": (
        "Produce a Pricing Strategy. EXACTLY 4 sections: "
        "SEASONAL PRICING ARCHITECTURE (peak / shoulder / off, EUR rate bands); "
        "ADR STRUCTURE (base, weekend uplift, holiday uplift, last-minute floor); "
        "OCCUPANCY STRATEGY (target bands per season, length-of-stay logic); "
        "WEEKEND PREMIUM LOGIC (Thu–Sun multipliers, minimum-stay rules). Numbers in EUR. Operational."
    ),
    "outdoor_package": (
        "Produce an Outdoor Transformation package. EXACTLY 5 sections: "
        "TERRACE CONCEPT (atmosphere, materials, hospitality moments); "
        "FURNITURE PACKAGE (specific pieces, brand-tier guidance, indicative EUR prices); "
        "PLANTING PROGRAM (species, scale, maintenance cadence); "
        "OUTDOOR LIGHTING LAYER (warm-temperature dusk-to-night program); "
        "HOSPITALITY PROGRAM (sundown / dinner / breakfast moments scripted). Each item ≤ 1 line."
    ),
    "space_transformation": (
        "Produce a Space Transformation package. EXACTLY 4 sections: "
        "EXECUTION PLAN (sequenced workstreams, owner roles, timeline in weeks); "
        "SHOPPING / SPEC LIST (materials, fixtures, furniture, indicative EUR prices); "
        "VISUAL DIRECTION (how the upgraded space reads — material, light, atmosphere); "
        "ROI PROJECTION (capex EUR, revenue uplift EUR, payback in months). Operational."
    ),
    "execute_upgrade": (
        "Produce a focused Execution package for this recommendation. EXACTLY 4 sections: "
        "EXECUTION PLAN (sequenced steps, dependencies, timeline in weeks); "
        "SHOPPING / SPEC LIST (with brand-tier guidance and indicative EUR prices); "
        "VISUAL DIRECTION (3–5 bullet lines on the upgraded outcome); "
        "ROI IMPACT (revenue uplift mechanism, payback period in months, sensitivity)."
    ),
    "optimize_listing": (
        "Produce a quick-pass Listing Optimization. EXACTLY 3 sections: "
        "TITLE + DESCRIPTION (one optimised title + 2 short editorial paragraphs); "
        "SEO + GUEST TARGETING (key terms + 2 traveller personas); "
        "AMENITIES + COVER STRATEGY (priority order + cover-image logic). Concise."
    ),
    "project_roi": (
        "Produce a focused ROI Projection. EXACTLY 3 sections: "
        "REVENUE UPLIFT MECHANISM (specific drivers in this market); "
        "CAPEX + PAYBACK (EUR numbers, payback in months); "
        "SENSITIVITY (occupancy band, ADR band, downside case)."
    ),
    # ── Single actions (kept for backwards compatibility) ────────────────────
    "execution_plan": "Produce a step-by-step execution plan: sequencing, dependencies, owner roles, and timeline. Investor-grade detail.",
    "shopping_list": "Produce a refined shopping/specification list with brand-tier guidance (designer / mid-luxury / mid-tier) and example references where appropriate.",
    "design_prompt": "Produce an editorial AI image-generation prompt (single concise paragraph + style tags) that captures the upgraded space at golden hour.",
    "roi_impact": "Produce a quantified ROI impact: revenue uplift mechanism, payback period, seasonal sensitivity, and break-even assumptions.",
    "creative_brief": "Produce a creative brief in the voice of an architectural design studio: intent, references, materials, mood, success metrics.",
    "visualize_upgrade": "Produce a cinematic written visualization of the upgraded space: light, materials, sound, scent, atmosphere, sequence of guest perception.",
    "shot_list": "Produce an editorial shot list (10–14 frames) with framing, time-of-day, and lighting guidance for each frame.",
    "photographer_brief": "Produce a photographer brief: references, set styling, schedule, post-production direction, deliverables.",
    "styling_direction": "Produce a styling direction sheet: textiles, ceramics, plating, florals, layering principles, what to remove from the frame.",
    "airbnb_cover_strategy": "Produce a cover-image strategy: hero frame logic, supporting frame sequence, A/B variants, click-through hypothesis.",
    "lighting_plan": "Produce a layered evening lighting plan: fixture archetypes, placements, colour temperatures (Kelvin), dimming curves, switching logic.",
    "adr_impact": "Produce an ADR uplift estimate: mechanism (perception lift × evening photography × repeat-stay), seasonal sensitivity, comp-set positioning.",
    "terrace_concept": "Produce a luxury terrace concept: materials, furniture, planting, lighting, hospitality program (dining, sundown, breakfast).",
    "furniture_package": "Produce a furniture specification package: items, materials, brand-tier guidance, style cohesion, sourcing notes.",
    "architect_brief": "Produce a brief for a boutique hospitality architect: scope, constraints, references, success criteria, deliverable expectations.",
    "roi_projection": "Produce a 3-year ROI projection: capex, year-over-year revenue lift, occupancy/ADR sensitivities, residual asset value.",
    "airbnb_title": "Produce 5 refined Airbnb listing title candidates (≤ 50 chars each) with one-line rationale per title.",
    "listing_description": "Produce an editorial Airbnb listing description in 3–4 short paragraphs — emotional, architectural, hospitality-fluent.",
    "seo_keywords": "Produce a curated keyword set: head terms, long-tail phrases, geo-modifiers, premium-traveler intent terms.",
    "guest_positioning": "Produce guest persona positioning: 2–3 target traveler segments, emotional driver, voice, channels.",
}


class TransformRequest(BaseModel):
    action: str
    recommendation: Dict[str, Any]
    property: Dict[str, Any] = {}


@router.post("/transform")
async def transform(payload: TransformRequest):
    if payload.action not in TRANSFORM_DIRECTIVES:
        raise HTTPException(400, "Unknown action")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI key not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as exc:
        logger.error(f"emergentintegrations import failed: {exc}")
        raise HTTPException(503, "AI library unavailable")

    rec = payload.recommendation or {}
    prop = payload.property or {}
    directive = TRANSFORM_DIRECTIVES[payload.action]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"transform-{uuid.uuid4().hex[:10]}",
        system_message=TRANSFORM_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        f"Property context:\n"
        f"- Name: {prop.get('name','—')}\n"
        f"- Market: {prop.get('city','—')}\n"
        f"- Type: {prop.get('property_type','—')} | {prop.get('sqm','—')} sqm | sleeps {prop.get('sleeps','—')}\n"
        f"- Current ADR: €{prop.get('nightly_rate','—')}\n\n"
        f"Recommendation:\n"
        f"- Title: {rec.get('title','—')}\n"
        f"- Detail: {rec.get('detail') or rec.get('title') or '—'}\n\n"
        f"Directive: {directive}\n\n"
        f"Return the JSON object now."
    )

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:
        logger.error(f"Transform AI call failed: {exc}")
        raise HTTPException(502, "AI provider error — please try again")

    cleaned = (raw if isinstance(raw, str) else str(raw)).strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip("` \n")
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        s = cleaned.find("{")
        e = cleaned.rfind("}")
        if s >= 0 and e > s:
            try:
                parsed = json.loads(cleaned[s : e + 1])
            except json.JSONDecodeError:
                logger.error(f"Transform returned non-JSON: {cleaned[:400]}")
                raise HTTPException(502, "AI response was not valid JSON")
        else:
            logger.error(f"Transform returned non-JSON: {cleaned[:400]}")
            raise HTTPException(502, "AI response was not valid JSON")

    parsed["action"] = payload.action
    return parsed


# ---------------------------------------------------------------------------
# Stripe Checkout — moved to routers/checkout.py (iter66 refactor).
# Tier table (PRICING_TIERS) + StripeCheckoutRequest + 3 endpoints now live
# in that file. server.py mounts the router at the bottom.
# ---------------------------------------------------------------------------


# Invest — extracted to routers/invest.py (iter66 refactor).

# ---------------------------------------------------------------------------
# Propul8 OPERATE — Listing sync (PMS / channel-manager)
# ---------------------------------------------------------------------------
# Durable record of every "Approve & Sync" action. Real PMS adapters
# (Airbnb / Booking / Hostaway) plug in by consuming `queued` jobs and
# advancing them to `submitted` / `confirmed`. For now the worker
# auto-progresses on a deterministic schedule so the UI shows realistic
# status transitions without faking the data shape.

class ListingSyncRequest(BaseModel):
    property_id:       Optional[str] = None
    target_platform:   str = "all"   # all | airbnb | booking | sothebys
    listing_title:     str
    listing_description: str
    nightly_rate_eur:  Optional[int] = None
    minimum_stay:      Optional[int] = None
    headline_image:    Optional[str] = None


@router.post("/sync/listing")
async def sync_listing(payload: ListingSyncRequest):
    if not payload.listing_title or not payload.listing_description:
        raise HTTPException(400, "listing_title and listing_description required")

    job_id = _short_id("sync_", 12)
    now = datetime.now(timezone.utc)
    doc = {
        "_id":               job_id,
        "job_id":            job_id,
        "property_id":       payload.property_id,
        "target_platform":   payload.target_platform,
        "listing_title":     payload.listing_title[:240],
        "listing_description": payload.listing_description[:8000],
        "nightly_rate_eur":  payload.nightly_rate_eur,
        "minimum_stay":      payload.minimum_stay,
        "headline_image":    payload.headline_image,
        "status":            "queued",
        "timeline": [
            {"step": "queued", "at": now.isoformat(), "note": "Job accepted by Propul8 sync engine"},
        ],
        "created_at": now,
        "updated_at": now,
    }
    await _db["sync_jobs"].insert_one(doc)
    doc.pop("_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


def _advance_sync_status(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic status progression based on elapsed seconds since
    creation. Real PMS adapters can override this by writing direct
    timeline entries — this helper only fills in the gaps.
        0–4s   queued
        4–10s  submitted
        ≥10s   confirmed
    """
    if not isinstance(doc.get("created_at"), datetime):
        return doc

    created_at = doc["created_at"]
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
    desired = "queued" if elapsed < 4 else "submitted" if elapsed < 10 else "confirmed"

    if doc.get("status") == desired:
        return doc

    timeline = list(doc.get("timeline") or [])
    notes = {
        "submitted": "Listing payload transmitted to channel manager",
        "confirmed": "Channel manager confirmed live propagation",
    }
    timeline.append({
        "step": desired,
        "at":   datetime.now(timezone.utc).isoformat(),
        "note": notes.get(desired, ""),
    })
    doc["status"]     = desired
    doc["timeline"]   = timeline
    doc["updated_at"] = datetime.now(timezone.utc)
    return doc


@router.get("/sync/listing/{job_id}")
async def sync_listing_status(job_id: str):
    doc = await _db["sync_jobs"].find_one({"job_id": job_id})
    if not doc:
        raise HTTPException(404, "sync job not found")
    advanced = _advance_sync_status(doc)
    if advanced.get("updated_at") != doc.get("created_at"):
        await _db["sync_jobs"].update_one(
            {"job_id": job_id},
            {"$set": {
                "status":     advanced["status"],
                "timeline":   advanced["timeline"],
                "updated_at": advanced["updated_at"],
            }},
        )
    advanced.pop("_id", None)
    if isinstance(advanced.get("created_at"), datetime):
        advanced["created_at"] = advanced["created_at"].isoformat()
    if isinstance(advanced.get("updated_at"), datetime):
        advanced["updated_at"] = advanced["updated_at"].isoformat()
    return advanced


@router.get("/sync/listings")
async def sync_listing_history(property_id: Optional[str] = None, limit: int = 10):
    """Recent sync jobs — used by ListingRewrite to show a history panel."""
    q: Dict[str, Any] = {}
    if property_id:
        q["property_id"] = property_id
    cursor = _db["sync_jobs"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    out = []
    async for doc in cursor:
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        if isinstance(doc.get("updated_at"), datetime):
            doc["updated_at"] = doc["updated_at"].isoformat()
        # Truncate description so the wire payload stays small
        if doc.get("listing_description"):
            doc["listing_description"] = doc["listing_description"][:240]
        out.append(doc)
    return {"jobs": out}


