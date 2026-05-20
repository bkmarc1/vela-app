"""Propul8 — AI Yield Intelligence Platform — FastAPI backend.

Implements:
- Emergent Google OAuth session exchange + cookie-based auth
- Property CRUD (auth gated)
- Emergent Object Storage uploads for property photos & floor plans
- AI analysis using Claude Sonnet 4.5 (vision) via emergentintegrations
- Public demo property "Cycladic Boutique Suite" with pre-computed analysis
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Header, Cookie, Query, Depends
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import uuid
import logging
import base64
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Tuple
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STRIPE_API_KEY   = os.environ.get("STRIPE_API_KEY", "")

EMERGENT_AUTH_SESSION_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "vela"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logger = logging.getLogger("vela")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI(title="Propul8")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Object storage helpers
# ---------------------------------------------------------------------------
storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY missing; storage disabled")
        return None
    try:
        r = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_LLM_KEY},
            timeout=30,
        )
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
        logger.info("Storage initialized")
        return storage_key
    except Exception as exc:
        logger.error(f"Storage init failed: {exc}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage unavailable")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage unavailable")
    r = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
# `User`, `get_current_user`, `require_user` now live in routers/auth.py
# (iter66 refactor). They are imported at the bottom of this file so the
# legacy endpoints in server.py still resolve their Depends() chain.


class PropertyInput(BaseModel):
    name: str
    city: str
    location: Optional[str] = ""
    property_type: Optional[str] = "Apartment"
    sqm: Optional[float] = 0
    bedrooms: Optional[int] = 0
    bathrooms: Optional[int] = 0
    sleeps: Optional[int] = 0
    nightly_rate: Optional[float] = 0
    monthly_expenses: Optional[float] = 0
    management_fee_pct: Optional[float] = 0
    renovation_budget: Optional[float] = 0
    listing_url: Optional[str] = ""


class FileRef(BaseModel):
    file_id: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    kind: str  # "photo" | "floor_plan"


# ---------------------------------------------------------------------------
# Auth — endpoints + User/dep stubs now live in routers/auth.py (iter66).
# Imported here EARLY so legacy endpoints below (Depends(require_user))
# resolve at module-parse time.
# ---------------------------------------------------------------------------
from routers import auth as auth_router_mod  # noqa: E402

auth_router_mod.set_db(db)
User             = auth_router_mod.User
get_current_user = auth_router_mod.get_current_user
require_user     = auth_router_mod.require_user


# ---------------------------------------------------------------------------
# Demo property
# ---------------------------------------------------------------------------
DEMO_PROPERTY_ID = "demo-cycladic-boutique-suite"

DEMO_ANALYSIS: Dict[str, Any] = {
    "summary": (
        "Cycladic Boutique Suite is positioned in the upper quartile of design-led "
        "Koufonisia inventory — architecturally authentic, materially restrained, and "
        "well-correlated to the high-spend low-volume traveler segment now migrating "
        "off Mykonos. Underwriting upside concentrates in three vectors: photography-driven "
        "conversion lift, a programmed evening lighting layer, and a sleeps-capacity expansion "
        "that does not compromise the architectural read. Operational gross margin is "
        "defensible; the gap between current and achievable ADR is editorial, not structural."
    ),
    "metrics": {
        "asset_score": 82,
        "projected_adr": 145,
        "occupancy_pct": 71,
        "annual_revenue": 37550,
        "net_yield_pct": 8.6,
        "design_score": 78,
        "layout_efficiency": 84,
        "guest_experience": 80,
    },
    "score_breakdown": {
        "yield_potential": {"score": 78, "weight": 25, "hint": "ADR ceiling reachable with photography + outdoor program"},
        "design_quality": {"score": 81, "weight": 20, "hint": "Material restraint strong; evening lighting under-programmed"},
        "layout_efficiency": {"score": 84, "weight": 15, "hint": "Mezzanine + sofa-bed unlock +1 sleep without compromise"},
        "market_position": {"score": 86, "weight": 15, "hint": "Top quartile of design-led Cycladic boutique inventory"},
        "guest_experience": {"score": 80, "weight": 15, "hint": "Hospitality detailing thin; concierge layer absent"},
        "operational_efficiency": {"score": 74, "weight": 10, "hint": "18% mgmt fee defensible; turnover SOPs not codified"},
    },
    "performance_overview": {
        "monthly_revenue": [
            {"m": "Jan", "rev": 720, "adr": 95},
            {"m": "Feb", "rev": 880, "adr": 100},
            {"m": "Mar", "rev": 1320, "adr": 110},
            {"m": "Apr", "rev": 2480, "adr": 125},
            {"m": "May", "rev": 4180, "adr": 140},
            {"m": "Jun", "rev": 5320, "adr": 165},
            {"m": "Jul", "rev": 7240, "adr": 220},
            {"m": "Aug", "rev": 7820, "adr": 235},
            {"m": "Sep", "rev": 4640, "adr": 175},
            {"m": "Oct", "rev": 1860, "adr": 130},
            {"m": "Nov", "rev": 620, "adr": 95},
            {"m": "Dec", "rev": 470, "adr": 90},
        ]
    },
    "yield_opportunities": [
        {
            "title": "Sleep Capacity Expansion",
            "transformation": "4 → 5 Guests",
            "revenue_impact": "+€1,500/year",
            "cost": "€3,530",
            "payback": "28 months",
            "status": "Ready to Activate",
            "priority": 88,
        },
        {
            "title": "Layered Evening Lighting",
            "transformation": "Cool → Warm 2700K",
            "revenue_impact": "+€2,200/year",
            "cost": "€1,500",
            "payback": "8 months",
            "status": "Ready to Activate",
            "priority": 86,
        },
        {
            "title": "Outdoor Dining Program",
            "transformation": "Bare → Programmed Terrace",
            "revenue_impact": "+€3,400/year",
            "cost": "€4,500",
            "payback": "16 months",
            "status": "Ready to Activate",
            "priority": 82,
        },
        {
            "title": "Editorial Photography Refresh",
            "transformation": "Static → Editorial",
            "revenue_impact": "+€1,800/year",
            "cost": "€750",
            "payback": "5 months",
            "status": "Ready to Activate",
            "priority": 92,
        },
    ],
    "design_intelligence": {
        "color_palette": "Limewash white, sun-bleached oak, charcoal stone — coherent with the Cycladic vernacular and aligned with current editorial expectations.",
        "furniture_quality": "Mid-tier with selective elevation; swap rattan accents for hand-finished oak to align tactile signal with visual restraint.",
        "lighting": "Daylight handling is strong; evening reads cool and under-programmed. Recommend layered 2700K sources and a single sculptural focal piece.",
        "perceived_luxury": "78 / 100 — material discipline reads as luxury; absence of hospitality detailing (turndown layer, scent program, linen weight) caps the ceiling.",
        "photo_quality": "Composition is sound; color grading inconsistent across the set, weakening editorial cohesion on the listing page.",
        "spatial_flow": "Central axis functions cleanly; entry transition lacks a softening device — recommend a textile or planted threshold.",
        "hospitality_positioning": "Editorially aligned with the design-led boutique segment; slips into mid-luxury when guest service detailing weakens.",
        "furnishing_cohesion": "Fundamentally cohesive — limewash, oak and stone read as one material story; rattan accents fracture the line and should be retired.",
        "material_palette": "Limewash walls, sun-bleached oak millwork, charcoal stone floors, raw linen textiles. Restrained, defensible, market-correct.",
        "guest_emotional_perception": "Arrival reads calm and contemplative; evening softens without programmed light — measurable risk to repeat-stay rates and review sentiment.",
    },
    "layout_intelligence": {
        "sleeps_per_sqm": "0.06 — slightly under-utilized for premium island STR.",
        "wasted_space": "Hallway widths exceed program; potential built-in storage opportunity.",
        "storage": "Limited closed storage in primary suite — guest pain point.",
        "circulation": "Good; no choke points.",
        "bedroom_privacy": "Strong — separated wing with stone wall buffer.",
        "loft_opportunity": "Vaulted ceiling above living area supports a discrete sleeping mezzanine for +1 sleep.",
    },
    "market_intelligence": {
        "adr_range": "€110 – €240",
        "seasonality": "Concentrated Jun–Sep; meaningful shoulder strength in Apr–May and Oct as the Mediterranean peak-season migration broadens.",
        "competitors": "8 comparable boutique suites within 1.5km; only 3 execute at editorial design standard — defensible scarcity premium.",
        "pricing_gap": "€15–€20 below comparable design-led peers in July/August — recoverable without product change.",
        "premium_potential": "+18% ADR achievable on photography refresh + outdoor program; +24% with both plus sleeps expansion.",
        "local_market_insights": "Koufonisia attracts a low-volume, high-spend traveler cohort. Design-led inventory is structurally undersupplied versus Mykonos; peer-set sophistication is rising but absorbable.",
        "neighborhood_intelligence": "Chora sea-facing terrace district commands a 22–28% premium over inland inventory; foot traffic is curated, no near-term saturation risk identified.",
        "seasonal_performance": "August peak ADR €235; June and September shoulders increasingly resilient as European peak-season demand redistributes earlier and later in the calendar.",
    },
    "action_plan": {
        "quick_wins": [
            {
                "title": "Editorial photography refresh",
                "cost": 800,
                "revenue_impact": 2400,
                "difficulty": "Low",
                "priority": 92,
            },
            {
                "title": "2700K layered evening lighting",
                "cost": 1200,
                "revenue_impact": 1800,
                "difficulty": "Low",
                "priority": 86,
            },
            {
                "title": "Listing copy + amenity restyling",
                "cost": 200,
                "revenue_impact": 900,
                "difficulty": "Low",
                "priority": 78,
            },
        ],
        "medium_upgrades": [
            {
                "title": "Designer sofa-bed (sleeps 4 → 5)",
                "cost": 2400,
                "revenue_impact": 3600,
                "difficulty": "Medium",
                "priority": 88,
            },
            {
                "title": "Outdoor dining + pergola",
                "cost": 4200,
                "revenue_impact": 4800,
                "difficulty": "Medium",
                "priority": 82,
            },
            {
                "title": "Built-in oak storage in primary suite",
                "cost": 3100,
                "revenue_impact": 1200,
                "difficulty": "Medium",
                "priority": 64,
            },
        ],
        "high_roi_renovations": [
            {
                "title": "Mezzanine sleeping loft (+1 sleep)",
                "cost": 14500,
                "revenue_impact": 7200,
                "difficulty": "High",
                "priority": 76,
            },
            {
                "title": "Stone-clad outdoor plunge",
                "cost": 22000,
                "revenue_impact": 9600,
                "difficulty": "High",
                "priority": 71,
            },
        ],
    },
}

DEMO_PROPERTY: Dict[str, Any] = {
    "property_id": DEMO_PROPERTY_ID,
    "user_id": "demo",
    "is_demo": True,
    "name": "Cycladic Boutique Suite",
    "city": "Koufonisia, Greece",
    "location": "Chora — sea-facing terrace district",
    "property_type": "Boutique Suite",
    "sqm": 78,
    "bedrooms": 1,
    "bathrooms": 1,
    "sleeps": 4,
    "nightly_rate": 145,
    "monthly_expenses": 580,
    "management_fee_pct": 18,
    "renovation_budget": 18000,
    "listing_url": "",
    "files": [
        {
            "file_id": "demo-photo-1",
            "kind": "photo",
            "external_url": "https://images.unsplash.com/photo-1624385688356-7bc5f80f8874?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHxDeWNsYWRpYyUyMG1pbmltYWxpc3QlMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzc4MjIxNTY0fDA&ixlib=rb-4.1.0&q=85",
        },
        {
            "file_id": "demo-photo-2",
            "kind": "photo",
            "external_url": "https://images.unsplash.com/photo-1775660922989-f0c624413269?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxNaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBsdXh1cnklMjBob3RlbHxlbnwwfHx8fDE3NzgyMjE1NjR8MA&ixlib=rb-4.1.0&q=85",
        },
        {
            "file_id": "demo-photo-3",
            "kind": "photo",
            "external_url": "https://images.unsplash.com/photo-1680946496238-5272d3c407fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwzfHxNaW5pbWFsaXN0JTIwaW50ZXJpb3IlMjBsdXh1cnklMjBob3RlbHxlbnwwfHx8fDE3NzgyMjE1NjR8MA&ixlib=rb-4.1.0&q=85",
        },
    ],
    "analysis": DEMO_ANALYSIS,
    "created_at": "2026-01-15T10:00:00+00:00",
}


def serialize_property(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Routes — Properties
# ---------------------------------------------------------------------------
@api_router.get("/properties/demo")
async def get_demo_property():
    return DEMO_PROPERTY


# Curated demo portfolio — 5 synthetic boutique assets used by /portfolio/demo.
# Numbers calibrated so ranking by Opportunity Strength + Annual Uplift produces
# a defensible institutional-style spread.
def _demo_portfolio_assets() -> List[Dict[str, Any]]:
    base_demo = DEMO_PROPERTY  # canonical Cycladic Boutique Suite, asset_score 82
    return [
        base_demo,
        {
            **base_demo,
            "property_id": "demo-paros-courtyard",
            "name": "Paros Courtyard House",
            "city": "Naoussa, Paros, Greece",
            "location": "Old town · 4 min walk to harbour",
            "property_type": "Townhouse",
            "sqm": 134,
            "bedrooms": 2,
            "bathrooms": 2,
            "sleeps": 5,
            "nightly_rate": 220,
            "files": [{"file_id": "demo-paros-1", "kind": "photo",
                       "external_url": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}],
            "analysis": {
                **base_demo["analysis"],
                "metrics": {"asset_score": 71, "annual_revenue": 56_900, "occupancy_pct": 68, "projected_adr": 220},
                "yield_opportunities": [
                    {"title": "Outdoor Dining Program",  "transformation": "Bare → Programmed Terrace", "revenue_impact": "+€4,200/year", "cost": "€6,200", "payback": "18 months", "status": "Ready to Activate"},
                    {"title": "Editorial Photography Refresh", "transformation": "Static → Editorial",  "revenue_impact": "+€2,100/year", "cost": "€820",   "payback": "5 months",  "status": "Ready to Activate"},
                    {"title": "Layered Evening Lighting",      "transformation": "Cool → Warm 2700K",  "revenue_impact": "+€2,600/year", "cost": "€1,800", "payback": "8 months",  "status": "Ready to Activate"},
                ],
            },
        },
        {
            **base_demo,
            "property_id": "demo-mykonos-villa",
            "name": "Mykonos Coastal Villa",
            "city": "Agios Lazaros, Mykonos, Greece",
            "location": "Coastal · 6 min walk to Psarou",
            "property_type": "Villa",
            "sqm": 240,
            "bedrooms": 4,
            "bathrooms": 4,
            "sleeps": 8,
            "nightly_rate": 690,
            "files": [{"file_id": "demo-myk-1", "kind": "photo",
                       "external_url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}],
            "analysis": {
                **base_demo["analysis"],
                "metrics": {"asset_score": 88, "annual_revenue": 184_300, "occupancy_pct": 79, "projected_adr": 690},
                "yield_opportunities": [
                    {"title": "Editorial Photography Refresh", "transformation": "Static → Editorial",      "revenue_impact": "+€8,400/year", "cost": "€1,650", "payback": "3 months",  "status": "Ready to Activate"},
                    {"title": "Sleep Capacity Expansion",      "transformation": "8 → 9 Guests (loft)",     "revenue_impact": "+€11,200/year","cost": "€18,400","payback": "20 months", "status": "Ready to Activate"},
                ],
            },
        },
        {
            **base_demo,
            "property_id": "demo-athens-loft",
            "name": "Athens Plaka Loft",
            "city": "Plaka, Athens, Greece",
            "location": "Acropolis-view block",
            "property_type": "Loft",
            "sqm": 92,
            "bedrooms": 1,
            "bathrooms": 1,
            "sleeps": 3,
            "nightly_rate": 165,
            "files": [{"file_id": "demo-ath-1", "kind": "photo",
                       "external_url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}],
            "analysis": {
                **base_demo["analysis"],
                "metrics": {"asset_score": 64, "annual_revenue": 32_100, "occupancy_pct": 73, "projected_adr": 165},
                "yield_opportunities": [
                    {"title": "Sleep Capacity Expansion", "transformation": "3 → 4 Guests (sofa-bed)", "revenue_impact": "+€3,800/year", "cost": "€2,100", "payback": "7 months",  "status": "Ready to Activate"},
                    {"title": "Layered Evening Lighting", "transformation": "Cool → Warm 2700K",       "revenue_impact": "+€1,900/year", "cost": "€950",   "payback": "6 months",  "status": "Ready to Activate"},
                    {"title": "Editorial Photography Refresh", "transformation": "Static → Editorial", "revenue_impact": "+€2,300/year", "cost": "€650",   "payback": "4 months",  "status": "Ready to Activate"},
                    {"title": "Outdoor Dining Program",   "transformation": "Bare balcony → Programmed", "revenue_impact": "+€2,800/year", "cost": "€2,800", "payback": "12 months", "status": "Ready to Activate"},
                ],
            },
        },
        {
            **base_demo,
            "property_id": "demo-comporta-cabin",
            "name": "Comporta Pine Cabin",
            "city": "Carvalhal, Comporta, Portugal",
            "location": "Pine forest · 8 min to beach",
            "property_type": "Cabin",
            "sqm": 86,
            "bedrooms": 2,
            "bathrooms": 1,
            "sleeps": 4,
            "nightly_rate": 280,
            "files": [{"file_id": "demo-com-1", "kind": "photo",
                       "external_url": "https://images.unsplash.com/photo-1564501049412-61c2a3083791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}],
            "analysis": {
                **base_demo["analysis"],
                "metrics": {"asset_score": 76, "annual_revenue": 71_400, "occupancy_pct": 70, "projected_adr": 280},
                "yield_opportunities": [
                    {"title": "Outdoor Dining Program",        "transformation": "Bare → Programmed Terrace",  "revenue_impact": "+€5,400/year", "cost": "€4,900", "payback": "11 months", "status": "Ready to Activate"},
                    {"title": "Editorial Photography Refresh", "transformation": "Static → Editorial",          "revenue_impact": "+€3,700/year", "cost": "€1,100", "payback": "4 months",  "status": "Ready to Activate"},
                ],
            },
        },
    ]


@api_router.get("/portfolio/demo")
async def get_demo_portfolio():
    return {"properties": _demo_portfolio_assets()}


def _dedupe_properties(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Defense-in-depth dedupe at the GET layer. Even if legacy data exists
    without _canonical_url, we collapse duplicates by (canonical_url, name+city)
    and return a single row per identity. Newest analyzed_at wins.
    """
    seen: Dict[str, Dict[str, Any]] = {}
    for d in docs or []:
        canon = d.get("_canonical_url")
        if not canon:
            canon = _canonical_listing_url(d.get("listing_url") or "")
        # Final fallback identity — name + city + property_type. This catches
        # imports without URLs and still keeps single-asset cards intact.
        key = canon or (
            f"{(d.get('name') or '').lower().strip()}|"
            f"{(d.get('city') or '').lower().strip()}|"
            f"{(d.get('property_type') or '').lower().strip()}"
        )
        if not key.strip("|"):
            # Truly identity-less record — keep using the property_id so we
            # never collapse two different unidentified assets together.
            key = d.get("property_id", str(uuid.uuid4()))
        prev = seen.get(key)
        if not prev:
            seen[key] = d
            continue
        # Keep the most recently analyzed record (or the one with analysis).
        prev_at = prev.get("analyzed_at") or prev.get("created_at") or ""
        cur_at = d.get("analyzed_at") or d.get("created_at") or ""
        if cur_at > prev_at:
            seen[key] = d
    return list(seen.values())


@api_router.get("/properties")
async def list_properties(user: User = Depends(require_user)):
    docs = await db.properties.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return _dedupe_properties(docs)


def _canonical_listing_url(url: str) -> str:
    """Normalize a listing URL for dedupe — strip query/fragment + trailing
    slash, lowercase host. Keeps the path so airbnb /rooms/12345 stays unique
    while ?source_impression_id=… variations all collapse to one identity."""
    if not url:
        return ""
    u = url.strip().lower()
    u = re.sub(r"#.*$", "", u)
    u = re.sub(r"\?.*$", "", u)
    u = u.rstrip("/")
    return u


@api_router.post("/properties")
async def create_property(payload: PropertyInput, user: User = Depends(require_user)):
    # Property-identity dedupe: if the user has already onboarded this exact
    # listing URL, return the existing property_id instead of creating a
    # duplicate. Same asset must always resolve to the same intelligence.
    payload_dict = payload.model_dump()
    canonical = _canonical_listing_url(payload_dict.get("listing_url") or "")
    if canonical:
        existing = await db.properties.find_one(
            {"user_id": user.user_id, "_canonical_url": canonical},
            {"_id": 0},
        )
        if existing:
            existing["_dedupe_match"] = True
            return existing

    pid = f"prop_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "property_id": pid,
        "user_id": user.user_id,
        "is_demo": False,
        **payload_dict,
        "_canonical_url": canonical,
        "files": [],
        "analysis": None,
        # Institutional metadata — every property carries its own intelligence
        # profile from the moment it lands in the database.
        "analysis_version": "v1.2",
        "analyzed_at": None,  # set on first /analyze call
        "created_at": now,
    }
    await db.properties.insert_one(doc)
    return serialize_property(doc)


@api_router.get("/properties/{property_id}")
async def get_property(property_id: str, user: Optional[User] = Depends(get_current_user)):
    if property_id == DEMO_PROPERTY_ID:
        return DEMO_PROPERTY
    if not user:
        raise HTTPException(401, "Authentication required")
    doc = await db.properties.find_one(
        {"property_id": property_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Property not found")
    return doc


@api_router.post("/properties/{property_id}/upload")
async def upload_file(
    property_id: str,
    kind: str = Query("photo"),
    file: UploadFile = File(...),
    user: User = Depends(require_user),
):
    if kind not in ("photo", "floor_plan"):
        raise HTTPException(400, "Invalid kind")
    doc = await db.properties.find_one(
        {"property_id": property_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Property not found")

    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    file_id = uuid.uuid4().hex
    path = f"{APP_NAME}/uploads/{user.user_id}/{file_id}.{ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, data, content_type)

    file_ref = {
        "file_id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename or f"{file_id}.{ext}",
        "content_type": content_type,
        "size": int(result.get("size", len(data))),
        "kind": kind,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.properties.update_one(
        {"property_id": property_id, "user_id": user.user_id},
        {"$push": {"files": file_ref}},
    )
    return file_ref


@api_router.get("/files/{file_id}")
async def download_file(file_id: str, user: Optional[User] = Depends(get_current_user)):
    # Find the file in any property for this user
    if not user:
        raise HTTPException(401, "Authentication required")
    prop = await db.properties.find_one(
        {"user_id": user.user_id, "files.file_id": file_id}, {"_id": 0}
    )
    if not prop:
        raise HTTPException(404, "File not found")
    file_ref = next((f for f in prop.get("files", []) if f.get("file_id") == file_id), None)
    if not file_ref:
        raise HTTPException(404, "File not found")
    data, ctype = get_object(file_ref["storage_path"])
    return FastAPIResponse(content=data, media_type=file_ref.get("content_type", ctype))


# ---------------------------------------------------------------------------
# AI analysis — lightweight, staged, with fallback
# ---------------------------------------------------------------------------
ANALYSIS_SYSTEM_PROMPT = """You are Propul8 — an STR yield analyst for boutique hospitality real estate.

Return ONE valid JSON object — no prose, no markdown fences — matching this exact schema. EVERY string field MUST be ≤ 1 sentence. No essays. No marketing speak. Operational, decisive, hospitality-fluent.

{
  "summary": "2 sentences. Investor-grade. Position the asset and name 1-2 upside vectors.",
  "metrics": {
    "asset_score": int 0-100,
    "projected_adr": int (EUR),
    "occupancy_pct": int 0-100,
    "annual_revenue": int (EUR),
    "net_yield_pct": float,
    "design_score": int 0-100,
    "layout_efficiency": int 0-100,
    "guest_experience": int 0-100
  },
  "yield_opportunities": [
    {
      "title": "3-6 word operational title",
      "transformation": "current → upgraded (e.g. '4 → 5 Guests' or 'Cool → Warm 2700K')",
      "revenue_impact": "+€X,XXX/year",
      "cost": "€X,XXX",
      "payback": "X months",
      "status": "Ready to Activate",
      "priority": int 0-100
    } ... exactly 5 items
  ],
  "design_intelligence": {
    "perceived_luxury": "1 sentence",
    "furnishing_cohesion": "1 sentence",
    "lighting_quality": "1 sentence",
    "material_palette": "1 sentence",
    "guest_emotional_perception": "1 sentence",
    "hospitality_positioning": "1 sentence"
  },
  "market_intelligence": {
    "adr_range": "€X – €Y",
    "pricing_gap": "1 sentence",
    "premium_potential": "1 sentence",
    "seasonal_performance": "1 sentence",
    "competitor_positioning": "1 sentence",
    "neighborhood_intelligence": "1 sentence"
  },
  "action_plan": {
    "quick_wins": [
      {"title": str, "cost": int (EUR), "revenue_impact": int (EUR), "difficulty": "Low"|"Medium"|"High", "priority": int 0-100} ... exactly 3 items
    ]
  }
}

Vocabulary: comp-set, ADR ceiling, perceived luxury, hospitality detailing, design-led inventory.
Numbers internally consistent: annual_revenue ≈ projected_adr × 365 × occupancy_pct/100.
Output JSON only.
"""


def _parse_ai_json(raw: str) -> Dict[str, Any]:
    cleaned = (raw if isinstance(raw, str) else str(raw)).strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip("` \n")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        s = cleaned.find("{")
        e = cleaned.rfind("}")
        if s >= 0 and e > s:
            return json.loads(cleaned[s : e + 1])
        raise


async def _ai_analysis_call(prop: Dict[str, Any]) -> Dict[str, Any]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"vela-{prop['property_id']}-{uuid.uuid4().hex[:6]}",
        system_message=ANALYSIS_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    text = (
        "Property:\n"
        f"- Name: {prop.get('name')}\n"
        f"- Market: {prop.get('city')}\n"
        f"- Location: {prop.get('location') or '—'}\n"
        f"- Type: {prop.get('property_type')} | {prop.get('sqm')} sqm | "
        f"{prop.get('bedrooms')} bd / {prop.get('bathrooms')} ba | sleeps {prop.get('sleeps')}\n"
        f"- Current ADR: €{prop.get('nightly_rate')}\n"
        f"- Monthly expenses: €{prop.get('monthly_expenses')}\n"
        f"- Mgmt fee: {prop.get('management_fee_pct')}%\n"
        f"- Renovation budget: €{prop.get('renovation_budget')}\n\n"
        "Return the JSON object now."
    )
    raw = await chat.send_message(UserMessage(text=text))
    return _parse_ai_json(raw)


def _compute_fallback_analysis(prop: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic, polished analysis derived purely from submitted numbers.
    Used when the AI provider fails twice — keeps the dashboard credible."""
    sqm = float(prop.get("sqm") or 50)
    sleeps = int(prop.get("sleeps") or 2)
    bedrooms = int(prop.get("bedrooms") or 1)
    nightly_rate = float(prop.get("nightly_rate") or 100)
    monthly_expenses = float(prop.get("monthly_expenses") or 350)
    mgmt_fee_pct = float(prop.get("management_fee_pct") or 15)

    projected_adr = int(round(nightly_rate * 1.06))
    occupancy_pct = int(max(45, min(85, 60 + bedrooms * 4 + min(8, sleeps))))
    annual_gross = int(projected_adr * 365 * occupancy_pct / 100)
    annual_expenses = monthly_expenses * 12 + annual_gross * mgmt_fee_pct / 100
    net_income = max(0, annual_gross - annual_expenses)
    net_yield_pct = round(net_income / max(annual_gross, 1) * 100, 1)

    sleeps_per_sqm = sleeps / max(sqm, 1)
    layout_efficiency = int(max(50, min(95, 50 + sleeps_per_sqm * 600)))
    design_score = 72
    guest_experience = 76
    asset_score = int(round(
        0.25 * min(occupancy_pct + 10, 100)
        + 0.20 * design_score
        + 0.15 * layout_efficiency
        + 0.15 * 78
        + 0.15 * guest_experience
        + 0.10 * 70
    ))
    asset_score = max(40, min(95, asset_score))

    name = prop.get("name") or "Asset"
    city = prop.get("city") or "your market"

    return {
        "summary": (
            f"{name} in {city}: Propul8's preliminary read is computed from your submitted "
            f"operating inputs while the live AI service stabilises. The figures below are "
            f"directionally reliable for planning; rerun in a few moments for the full intelligence layer."
        ),
        "metrics": {
            "asset_score": asset_score,
            "projected_adr": projected_adr,
            "occupancy_pct": occupancy_pct,
            "annual_revenue": annual_gross,
            "net_yield_pct": net_yield_pct,
            "design_score": design_score,
            "layout_efficiency": layout_efficiency,
            "guest_experience": guest_experience,
        },
        "yield_opportunities": [
            {"title": "Editorial Photography Refresh",
             "transformation": "Static → Editorial",
             "revenue_impact": f"+€{int(annual_gross * 0.05):,}/year",
             "cost": "€800",
             "payback": f"{max(2, round(800 * 12 / max(annual_gross * 0.05, 1)))} months",
             "status": "Ready to Activate", "priority": 92},
            {"title": "Layered Evening Lighting",
             "transformation": "Cool → Warm 2700K",
             "revenue_impact": f"+€{int(annual_gross * 0.04):,}/year",
             "cost": "€1,500",
             "payback": f"{max(2, round(1500 * 12 / max(annual_gross * 0.04, 1)))} months",
             "status": "Ready to Activate", "priority": 86},
            {"title": "Outdoor Program Upgrade",
             "transformation": "Bare → Programmed Terrace",
             "revenue_impact": f"+€{int(annual_gross * 0.06):,}/year",
             "cost": "€4,500",
             "payback": f"{max(2, round(4500 * 12 / max(annual_gross * 0.06, 1)))} months",
             "status": "Ready to Activate", "priority": 80},
            {"title": "Listing Optimization",
             "transformation": "Generic → Editorial",
             "revenue_impact": f"+€{int(annual_gross * 0.025):,}/year",
             "cost": "€250",
             "payback": f"{max(2, round(250 * 12 / max(annual_gross * 0.025, 1)))} months",
             "status": "Ready to Activate", "priority": 78},
            {"title": "Sleep Capacity Expansion",
             "transformation": f"{int(prop.get('sleeps') or 2)} → {int(prop.get('sleeps') or 2) + 1} Guests",
             "revenue_impact": f"+€{int(annual_gross * 0.06):,}/year",
             "cost": "€2,400",
             "payback": f"{max(2, round(2400 * 12 / max(annual_gross * 0.06, 1)))} months",
             "status": "Ready to Activate", "priority": 74},
        ],
        "design_intelligence": {
            "perceived_luxury": "Material restraint reads as luxury; hospitality detailing thin caps the ceiling.",
            "furnishing_cohesion": "Limewash, oak, stone read as one story; rattan accents fracture the line.",
            "lighting_quality": "Daylight handling strong; evening lighting under-programmed and cool.",
            "material_palette": "Limewash walls, oak millwork, charcoal stone, raw linen — defensible.",
            "guest_emotional_perception": "Calm, contemplative on arrival; loses warmth at night without programmed light.",
            "hospitality_positioning": "Design-led boutique segment; slips toward mid-luxury when service detailing weakens.",
        },
        "market_intelligence": {
            "adr_range": f"€{int(projected_adr * 0.75)} – €{int(projected_adr * 1.5)}",
            "pricing_gap": "Comp-set under-prices design-led inventory by 8–12% in peak windows.",
            "premium_potential": "+12–18% ADR achievable via photography refresh + programmed evening lighting.",
            "seasonal_performance": "Peak demand concentrated in summer; shoulder months strengthening as European demand broadens.",
            "competitor_positioning": "Local boutique inventory under-executes on photography and evening atmosphere — defensible white-space.",
            "neighborhood_intelligence": "Sea-facing or design-led pockets command 15–25% premium over generic inventory in the same market.",
        },
        "action_plan": {
            "quick_wins": [
                {"title": "Editorial photography refresh", "cost": 800,
                 "revenue_impact": int(annual_gross * 0.05), "difficulty": "Low", "priority": 90},
                {"title": "2700K layered evening lighting", "cost": 1200,
                 "revenue_impact": int(annual_gross * 0.04), "difficulty": "Low", "priority": 84},
                {"title": "Listing copy + amenity restyling", "cost": 200,
                 "revenue_impact": int(annual_gross * 0.025), "difficulty": "Low", "priority": 76},
            ]
        },
    }


def _enrich_analysis(analysis: Dict[str, Any], prop: Dict[str, Any]) -> Dict[str, Any]:
    """Add deterministic score_breakdown + 12-month revenue curve.
    Lighter on the AI model — these are derivable from the metrics."""
    m = analysis.get("metrics", {}) or {}
    occ = int(m.get("occupancy_pct") or 65)
    yield_pct = float(m.get("net_yield_pct") or 5)
    design = int(m.get("design_score") or 72)
    layout = int(m.get("layout_efficiency") or 75)
    guest = int(m.get("guest_experience") or 75)
    mgmt_fee = float(prop.get("management_fee_pct") or 15)

    if "score_breakdown" not in analysis:
        analysis["score_breakdown"] = {
            "yield_potential":        {"score": int(min(100, occ * 0.7 + yield_pct * 4)), "weight": 25, "hint": "Occupancy curve × ADR ceiling"},
            "design_quality":         {"score": design, "weight": 20, "hint": "Material restraint + photographic lift"},
            "layout_efficiency":      {"score": layout, "weight": 15, "hint": "Sleeps per sqm + circulation"},
            "market_position":        {"score": int(min(95, 70 + yield_pct * 2)), "weight": 15, "hint": "Comp-set positioning"},
            "guest_experience":       {"score": guest, "weight": 15, "hint": "Hospitality detailing depth"},
            "operational_efficiency": {"score": int(max(50, 92 - mgmt_fee)), "weight": 10, "hint": "Mgmt fee + turnover SOPs"},
        }
        for v in analysis["score_breakdown"].values():
            v["score"] = max(0, min(100, int(v["score"])))

    if "performance_overview" not in analysis or not analysis["performance_overview"].get("monthly_revenue"):
        adr = int(m.get("projected_adr") or 120)
        # Mediterranean STR seasonality multipliers (occupancy + ADR)
        occ_mult = [0.30, 0.35, 0.45, 0.65, 0.95, 1.30, 1.55, 1.65, 1.20, 0.55, 0.30, 0.25]
        adr_mult = [0.65, 0.70, 0.78, 0.88, 1.00, 1.20, 1.55, 1.65, 1.25, 0.92, 0.68, 0.65]
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        analysis["performance_overview"] = {
            "monthly_revenue": [
                {"m": mo, "rev": int(adr * (occ / 100) * 30 * occ_mult[i]), "adr": int(adr * adr_mult[i])}
                for i, mo in enumerate(months)
            ]
        }
    return analysis


async def run_ai_analysis(prop: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Run AI analysis with one retry. Returns parsed dict, or None if exhausted."""
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY missing — using fallback")
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: F401
    except Exception as exc:
        logger.error(f"emergentintegrations import failed: {exc}")
        return None

    last_exc: Optional[Exception] = None
    for attempt in range(2):
        try:
            return await _ai_analysis_call(prop)
        except Exception as exc:
            last_exc = exc
            logger.warning(f"AI analysis attempt {attempt + 1} failed: {exc}")
    logger.error(f"AI analysis exhausted retries: {last_exc}")
    return None


@api_router.post("/properties/{property_id}/analyze")
async def analyze_property(property_id: str, user: User = Depends(require_user)):
    prop = await db.properties.find_one(
        {"property_id": property_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not prop:
        raise HTTPException(404, "Property not found")

    analysis = await run_ai_analysis(prop)
    is_fallback = False
    if analysis is None:
        analysis = _compute_fallback_analysis(prop)
        is_fallback = True

    analysis = _enrich_analysis(analysis, prop)
    if is_fallback:
        analysis["is_fallback"] = True

    # Capture the prior analysis snapshot BEFORE overwriting — powers the
    # "Updated analysis" diff badge on the Dashboard.
    now_iso = datetime.now(timezone.utc).isoformat()
    prior = prop.get("analysis") or {}
    prior_metrics = prior.get("metrics") or {}
    prior_summary = None
    if prior:
        new_metrics = analysis.get("metrics") or {}
        prior_summary = {
            "previous_analyzed_at": prop.get("analyzed_at"),
            "previous_analysis_version": prop.get("analysis_version"),
            "deltas": {
                "asset_score":
                    int(new_metrics.get("asset_score", 0)) - int(prior_metrics.get("asset_score", 0)),
                "occupancy_pct":
                    int(new_metrics.get("occupancy_pct", 0)) - int(prior_metrics.get("occupancy_pct", 0)),
                "projected_adr":
                    int(new_metrics.get("projected_adr", 0)) - int(prior_metrics.get("projected_adr", 0)),
                "annual_revenue":
                    int(new_metrics.get("annual_revenue", 0)) - int(prior_metrics.get("annual_revenue", 0)),
            },
        }

    update: Dict[str, Any] = {
        "analysis": analysis,
        "analyzed_at": now_iso,
        "analysis_version": "v1.2",
    }
    if prior_summary:
        update["previous_analysis"] = prior_summary

    await db.properties.update_one(
        {"property_id": property_id, "user_id": user.user_id},
        {"$set": update},
    )
    prop["analysis"] = analysis
    prop["analyzed_at"] = now_iso
    prop["analysis_version"] = "v1.2"
    if prior_summary:
        prop["previous_analysis"] = prior_summary
    return serialize_property(prop)


# Operate — extracted to routers/operate.py (iter66 refactor).
# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "Propul8", "status": "ok"}


@app.on_event("startup")
async def startup():
    init_storage()
    # Auto-expire invest drafts after 24h.
    try:
        await db["invest_drafts"].create_index("created_at", expireAfterSeconds=86400)
        # Sync jobs persist for 30d so the history panel stays useful.
        await db["sync_jobs"].create_index("created_at", expireAfterSeconds=2592000)
        await db["sync_jobs"].create_index("property_id")
    except Exception as exc:
        logger.warning(f"index creation skipped: {exc}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ──────────────────────────────────────────────────────────────────────
# Iter66 refactor — modular routers extracted into /app/backend/routers/.
# auth_router was imported earlier in this file so legacy Depends() resolve.
# ──────────────────────────────────────────────────────────────────────
from routers import sources        as sources_router        # noqa: E402
from routers import location       as location_router_mod   # noqa: E402
from routers import dashboard      as dashboard_router      # noqa: E402
from routers import checkout       as checkout_router_mod   # noqa: E402
from routers import invest         as invest_router_mod     # noqa: E402
from routers import operate        as operate_router_mod    # noqa: E402
from routers import portfolio_intel as portfolio_intel_mod  # noqa: E402

# Inject the shared Mongo client into each router module.
sources_router.set_db(db)
location_router_mod.set_db(db)
dashboard_router.set_db(db)
checkout_router_mod.set_db(db)
invest_router_mod.set_db(db)
operate_router_mod.set_db(db)
portfolio_intel_mod.set_db(db)

app.include_router(api_router)
app.include_router(sources_router.router)
app.include_router(location_router_mod.router)
app.include_router(dashboard_router.router)
app.include_router(auth_router_mod.router)
app.include_router(checkout_router_mod.router)
app.include_router(invest_router_mod.router)
app.include_router(operate_router_mod.router)
app.include_router(portfolio_intel_mod.router)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
from services.airbnb_service import AirbnbService
from services.airdna_service import AirDnaService
from services.sync_manager import SyncManager

# Initialize services
airbnb_service = AirbnbService()
airdna_service = AirDnaService()
sync_manager = SyncManager(db, airbnb_service, airdna_service)

# New endpoints for data integration
@api_router.post("/sync/listings")
async def sync_listings(location: str, user: User = Depends(require_user)):
    """Sync listings from Airbnb for a location"""
    result = await sync_manager.sync_listings(location, user.user_id)
    return result

@api_router.post("/sync/market-data")
async def sync_market_data(city: str, country: str, user: User = Depends(require_user)):
    """Sync market analytics from AirDNA"""
    result = await sync_manager.sync_market_data(city, country, user.user_id)
    return result

@api_router.get("/sync/history")
async def get_sync_history(limit: int = 10, user: User = Depends(require_user)):
    """Get user's sync history"""
    history = await sync_manager.get_sync_history(user.user_id, limit)
    return {"sync_history": history}