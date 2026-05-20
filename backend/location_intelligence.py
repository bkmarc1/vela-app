"""Propul8 — Location Intelligence Service.

Computes a single deterministic Location Score (0-10) plus sub-scores for any
property. Uses a dual-provider stack:

  • PRIMARY  : Google Maps Platform (Geocoding + Places New + Routes) when
               the env var `GOOGLE_MAPS_API_KEY` is set.
  • FALLBACK : OpenStreetMap (Nominatim for geocoding + Overpass for POIs)
               — free, real data, no API key required.

Both providers return the same standardized payload via `analyze_location()`
so the rest of the app never has to branch on the source.

Travel-time estimation: instead of an extra per-POI routing call, we use a
deterministic haversine + empirical pace model (walking 4.8 km/h, urban
driving 30 km/h). This keeps every call free, fast, and cache-friendly.

Scoring formula (lives in `_compute_scores`):
  walkability     — count of restaurants/cafes/supermarkets within 1500m
  tourism         — count of tourist_attractions/museums within 2000m
  beach_marina    — walk-distance to nearest beach OR marina
  convenience     — supermarket + pharmacy + metro within 1000m
  composite       — weighted blend → verdict (Weak / Average / Strong / Prime)
"""
from __future__ import annotations

import math
import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

from pydantic import BaseModel, Field

logger = __import__("logging").getLogger("location")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GOOGLE_API_KEY = (os.environ.get("GOOGLE_MAPS_API_KEY") or "").strip() or None

NOMINATIM_URL  = "https://nominatim.openstreetmap.org/search"
# Try mirrors in order — main `overpass-api.de` is often slow under load.
OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
GOOGLE_GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json"
GOOGLE_PLACES  = "https://places.googleapis.com/v1/places:searchNearby"

USER_AGENT     = "Propul8 Location Intelligence/1.0 (hospitality@propos.app)"

# Each POI category maps to OSM amenity/tourism tags + Google place types.
# `radius_m` is the search radius. `weight` is the contribution to scoring.
POI_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "restaurant":   {"radius_m": 1500, "osm": [("amenity", "restaurant")],            "google": ["restaurant"]},
    "cafe":         {"radius_m": 1500, "osm": [("amenity", "cafe")],                  "google": ["cafe"]},
    "supermarket":  {"radius_m": 1500, "osm": [("shop", "supermarket"),
                                                ("shop", "convenience")],             "google": ["supermarket", "grocery_store"]},
    "metro":        {"radius_m": 1500, "osm": [("railway", "station"),
                                                ("station", "subway"),
                                                ("public_transport", "station")],     "google": ["subway_station", "train_station"]},
    "beach":        {"radius_m": 5000, "osm": [("natural", "beach"),
                                                ("leisure", "beach_resort")],          "google": ["beach"]},
    "marina":       {"radius_m": 8000, "osm": [("leisure", "marina")],                 "google": ["marina"]},
    "landmark":     {"radius_m": 2500, "osm": [("tourism", "attraction"),
                                                ("tourism", "museum"),
                                                ("historic", "monument"),
                                                ("historic", "ruins")],                "google": ["tourist_attraction", "museum"]},
    "nightlife":    {"radius_m": 1500, "osm": [("amenity", "bar"),
                                                ("amenity", "nightclub"),
                                                ("amenity", "pub")],                   "google": ["bar", "night_club"]},
    "hospital":     {"radius_m": 4000, "osm": [("amenity", "hospital")],               "google": ["hospital"]},
    "pharmacy":     {"radius_m": 1500, "osm": [("amenity", "pharmacy")],               "google": ["pharmacy"]},
    "airport":      {"radius_m": 35000,"osm": [("aeroway", "aerodrome")],              "google": ["airport"]},
}

# Walking/driving pace (meters per minute).
WALK_M_PER_MIN  = 80.0   # ≈ 4.8 km/h
DRIVE_M_PER_MIN = 500.0  # ≈ 30 km/h urban

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class POIItem(BaseModel):
    name: str
    category: str
    lat: float
    lng: float
    distance_m: int
    walk_min: int
    drive_min: int


class LocationScores(BaseModel):
    location: float = Field(..., description="Composite 0-10 score")
    walkability: float
    tourism: float
    beach_marina: float
    convenience: float


class LocationIntelligence(BaseModel):
    address_input: str
    resolved_address: Optional[str] = None
    lat: float
    lng: float
    scores: LocationScores
    verdict: str                              # Weak | Average | Strong | Prime
    top_drivers: List[str]                    # 5 short value-driver bullets
    top_weaknesses: List[str]                 # 3 short weakness bullets
    noise_risk_notes: List[str]               # optional, may be []
    nearby_counts: Dict[str, int]             # poi_category → count within radius
    travel_summary: List[POIItem]             # one nearest POI per relevant category
    source: str                               # "google" | "openstreetmap"
    generated_at: datetime
    cached: bool = False

    class Config:
        json_encoders = {datetime: lambda d: d.isoformat()}


# ---------------------------------------------------------------------------
# Geo helpers
# ---------------------------------------------------------------------------
def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres."""
    R = 6_371_000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a  = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _travel_minutes(distance_m: float) -> Dict[str, int]:
    """Empirical walking + urban-driving minutes for a great-circle distance."""
    # Add 25% route inflation factor (real streets aren't straight lines).
    routed_m = distance_m * 1.25
    return {
        "walk_min":  max(1, int(round(routed_m / WALK_M_PER_MIN))),
        "drive_min": max(1, int(round(routed_m / DRIVE_M_PER_MIN))),
    }


# ---------------------------------------------------------------------------
# Geocoding providers
# ---------------------------------------------------------------------------
async def _geocode_google(address: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=12.0) as client:
        r = await client.get(GOOGLE_GEOCODE, params={"address": address, "key": GOOGLE_API_KEY})
        r.raise_for_status()
        data = r.json()
        results = data.get("results") or []
        if not results:
            return None
        first = results[0]
        loc = first["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"], "address": first.get("formatted_address")}


async def _geocode_nominatim(address: str) -> Optional[Dict[str, Any]]:
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        r = await client.get(NOMINATIM_URL, params={"q": address, "format": "json", "limit": 1, "addressdetails": 1})
        r.raise_for_status()
        items = r.json()
        if not items:
            return None
        first = items[0]
        return {
            "lat": float(first["lat"]),
            "lng": float(first["lon"]),
            "address": first.get("display_name"),
        }


# ---------------------------------------------------------------------------
# POI providers
# ---------------------------------------------------------------------------
async def _places_google(lat: float, lng: float) -> Dict[str, List[POIItem]]:
    """Parallel `places:searchNearby` per category — Field-Mask trimmed."""
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.location,places.types",
    }

    async def fetch(cat: str, cfg: Dict[str, Any]):
        body = {
            "includedTypes": cfg["google"],
            "maxResultCount": 10,
            "locationRestriction": {
                "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": min(cfg["radius_m"], 50000)},
            },
        }
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                r = await client.post(GOOGLE_PLACES, json=body)
                r.raise_for_status()
                places = (r.json() or {}).get("places", [])
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Google Places error for {cat}: {e}")
            return cat, []

        out: List[POIItem] = []
        for p in places:
            loc = (p.get("location") or {})
            plat, plng = loc.get("latitude"), loc.get("longitude")
            if plat is None or plng is None:
                continue
            dist = _haversine_m(lat, lng, plat, plng)
            tm   = _travel_minutes(dist)
            out.append(POIItem(
                name=(p.get("displayName") or {}).get("text", "Unknown"),
                category=cat,
                lat=plat, lng=plng,
                distance_m=int(round(dist)),
                walk_min=tm["walk_min"],
                drive_min=tm["drive_min"],
            ))
        out.sort(key=lambda x: x.distance_m)
        return cat, out

    results = await asyncio.gather(*(fetch(c, cfg) for c, cfg in POI_CATEGORIES.items()))
    return dict(results)


async def _places_overpass(lat: float, lng: float) -> Dict[str, List[POIItem]]:
    """One batched Overpass query covering every POI category we care about.

    Overpass is the killer here — one HTTPS roundtrip returns all 11 categories
    with full lat/lng + names. Much more efficient than Google's 11 parallel
    calls. We mark each element with a `_cat` tag via Overpass output tagging."""
    parts: List[str] = []
    # Element types per category — `node` for most amenities (which are mapped
    # as points), `way`+`relation` only for polygon-shaped features.
    AREA_CATS = {"beach", "marina", "airport", "landmark"}
    for cat, cfg in POI_CATEGORIES.items():
        elt_types = ("node", "way", "relation") if cat in AREA_CATS else ("node",)
        for (k, v) in cfg["osm"]:
            for elt in elt_types:
                parts.append(
                    f'{elt}["{k}"="{v}"](around:{cfg["radius_m"]},{lat},{lng});'
                )
    query = f"[out:json][timeout:25];({''.join(parts)});out tags center 500;"

    headers = {"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"}
    last_err: Optional[Exception] = None
    elements: List[Dict[str, Any]] = []
    for mirror in OVERPASS_MIRRORS:
        try:
            async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
                r = await client.post(mirror, data={"data": query})
                r.raise_for_status()
                elements = (r.json() or {}).get("elements", [])
                logger.info(f"Overpass mirror {mirror} returned {len(elements)} elements")
                break
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            logger.warning(f"Overpass mirror {mirror} failed: {exc}")
            continue
    if not elements and last_err:
        # All mirrors failed — return empty buckets gracefully so we don't 502.
        logger.error(f"All Overpass mirrors failed: {last_err}")
        return {c: [] for c in POI_CATEGORIES}

    # Bucket every returned element back into our category by re-matching tags.
    buckets: Dict[str, List[POIItem]] = {c: [] for c in POI_CATEGORIES}
    for el in elements:
        tags = el.get("tags") or {}
        # Find which category this element matches
        matched_cat: Optional[str] = None
        for cat, cfg in POI_CATEGORIES.items():
            for (k, v) in cfg["osm"]:
                if tags.get(k) == v:
                    matched_cat = cat
                    break
            if matched_cat:
                break
        if not matched_cat:
            continue

        # node vs way/relation: ways have center geometry
        plat = el.get("lat") or (el.get("center") or {}).get("lat")
        plng = el.get("lon") or (el.get("center") or {}).get("lon")
        if plat is None or plng is None:
            continue

        dist = _haversine_m(lat, lng, plat, plng)
        if dist > POI_CATEGORIES[matched_cat]["radius_m"]:
            continue
        tm = _travel_minutes(dist)
        name = (
            tags.get("name:en")
            or tags.get("name")
            or tags.get("brand")
            or f"{matched_cat.title()}"
        )
        buckets[matched_cat].append(POIItem(
            name=name,
            category=matched_cat,
            lat=plat, lng=plng,
            distance_m=int(round(dist)),
            walk_min=tm["walk_min"],
            drive_min=tm["drive_min"],
        ))

    # Sort each bucket by distance; cap at 12 items
    for cat in buckets:
        buckets[cat].sort(key=lambda x: x.distance_m)
        buckets[cat] = buckets[cat][:12]

    return buckets


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def _score_walkability(buckets: Dict[str, List[POIItem]]) -> float:
    # Count restaurants + cafes + supermarkets within 800m walk
    near = (
        sum(1 for p in buckets["restaurant"]  if p.walk_min <= 10)
        + sum(1 for p in buckets["cafe"]        if p.walk_min <= 10)
        + sum(1 for p in buckets["supermarket"] if p.walk_min <= 12)
    )
    # 0 → 0.0, 8 → 5.0, 24+ → 10.0
    return round(min(10.0, near / 2.4), 1)


def _score_tourism(buckets: Dict[str, List[POIItem]]) -> float:
    near = sum(1 for p in buckets["landmark"] if p.walk_min <= 25)
    if near == 0:
        return 0.0
    # 1 → 4.0, 3 → 7.0, 6+ → 10.0
    return round(min(10.0, 3.0 + math.log2(max(1, near)) * 2.2), 1)


def _score_beach_marina(buckets: Dict[str, List[POIItem]]) -> float:
    """Best of (nearest beach, nearest marina) scored on walk minutes."""
    candidates: List[int] = []
    for p in buckets["beach"]:
        candidates.append(p.walk_min)
        break
    for p in buckets["marina"]:
        candidates.append(p.walk_min + 2)  # marina slight penalty vs beach
        break
    if not candidates:
        return 0.0
    best = min(candidates)
    # 5min → 10, 15min → 7, 30min → 4, 60min+ → 1
    return round(max(0.0, min(10.0, 10.5 - best * 0.18)), 1)


def _score_convenience(buckets: Dict[str, List[POIItem]]) -> float:
    parts: List[float] = []
    parts.append(3.0 if any(p.walk_min <= 10 for p in buckets["supermarket"]) else 0.0)
    parts.append(2.5 if any(p.walk_min <= 12 for p in buckets["pharmacy"])    else 0.0)
    parts.append(3.0 if any(p.walk_min <= 15 for p in buckets["metro"])       else 0.0)
    parts.append(1.5 if any(p.drive_min <= 12 for p in buckets["hospital"])   else 0.0)
    return round(min(10.0, sum(parts)), 1)


def _composite_score(s: LocationScores) -> float:
    # Weighted blend tuned for hospitality (location matters most for STR yield).
    blend = (
        s.walkability  * 0.30
        + s.tourism      * 0.25
        + s.beach_marina * 0.25
        + s.convenience  * 0.20
    )
    return round(blend, 1)


def _verdict(score: float) -> str:
    if score >= 8.5: return "Prime"
    if score >= 7.0: return "Strong"
    if score >= 5.0: return "Average"
    return "Weak"


def _build_drivers_weaknesses(buckets: Dict[str, List[POIItem]], scores: LocationScores) -> Dict[str, List[str]]:
    drivers: List[str] = []
    weak: List[str] = []

    # Walkability driver
    near_food = [p for p in buckets["restaurant"] if p.walk_min <= 10]
    if near_food:
        drivers.append(f"{near_food[0].walk_min} min walk to {len(near_food)}+ restaurants")
    elif buckets["restaurant"]:
        weak.append("No restaurants within easy walking range")

    near_cafes = [p for p in buckets["cafe"] if p.walk_min <= 8]
    if near_cafes:
        drivers.append(f"{near_cafes[0].walk_min} min walk to cafe ({near_cafes[0].name})")

    # Beach / marina
    beach = buckets["beach"][0] if buckets["beach"] else None
    marina = buckets["marina"][0] if buckets["marina"] else None
    if beach and beach.walk_min <= 25:
        drivers.append(f"{beach.walk_min} min walk to beach ({beach.name})")
    elif beach:
        drivers.append(f"{beach.drive_min} min drive to nearest beach")
    if marina and marina.drive_min <= 20:
        drivers.append(f"{marina.drive_min} min drive to marina ({marina.name})")

    # Landmarks (tourism)
    landmark = buckets["landmark"][0] if buckets["landmark"] else None
    if landmark and landmark.walk_min <= 15:
        drivers.append(f"{landmark.walk_min} min walk to {landmark.name}")

    # Metro / transit
    metro = buckets["metro"][0] if buckets["metro"] else None
    if metro and metro.walk_min <= 12:
        drivers.append(f"{metro.walk_min} min walk to metro ({metro.name})")
    elif not metro:
        weak.append("No metro / rail station nearby")

    # Supermarket
    if not any(p.walk_min <= 12 for p in buckets["supermarket"]):
        weak.append("No supermarket within 1 km")

    # Hospital
    if not any(p.drive_min <= 15 for p in buckets["hospital"]):
        weak.append("Nearest hospital is over 15 min drive")

    # Airport
    air = buckets["airport"][0] if buckets["airport"] else None
    if air and air.drive_min <= 45:
        drivers.append(f"{air.drive_min} min drive to airport")

    # Tourism strength weakness
    if scores.tourism < 4.5:
        weak.append("Limited cultural / tourist attractions nearby")

    # De-dupe, cap 5 drivers / 3 weaknesses, keep insertion order
    seen: set = set()
    drivers = [d for d in drivers if not (d in seen or seen.add(d))][:5]
    seen = set()
    weak = [w for w in weak if not (w in seen or seen.add(w))][:3]
    return {"drivers": drivers, "weaknesses": weak}


def _noise_risk_notes(buckets: Dict[str, List[POIItem]]) -> List[str]:
    notes: List[str] = []
    night = [p for p in buckets["nightlife"] if p.walk_min <= 5]
    if len(night) >= 3:
        notes.append(f"{len(night)} bars/clubs within 5 min walk — potential weekend noise")
    air = buckets["airport"][0] if buckets["airport"] else None
    if air and air.drive_min <= 8:
        notes.append("Close to airport — potential flight-path noise")
    return notes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def analyze_location(*, address: Optional[str] = None,
                            lat: Optional[float] = None,
                            lng: Optional[float] = None,
                            cache_db=None) -> LocationIntelligence:
    """Main entry point. Either an address OR explicit lat/lng must be provided.

    `cache_db` (optional Motor AsyncIOMotorDatabase) — if passed, results are
    cached for 30 days keyed on rounded coordinates."""
    if not address and (lat is None or lng is None):
        raise ValueError("Provide either address or both lat and lng")

    address_input = address or f"{lat:.5f},{lng:.5f}"

    # 1a. Address-keyed cache pre-check (lets us skip the slow geocoding hop
    # entirely for repeat lookups of the same string).
    if address and cache_db is not None:
        try:
            pre = await cache_db["location_cache"].find_one(
                {"address_key": address.strip().lower()}, {"_id": 0},
            )
            if pre:
                gen_at = pre["generated_at"]
                if gen_at.tzinfo is None:
                    gen_at = gen_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) - gen_at < timedelta(days=30):
                    payload = pre["payload"]
                    payload["cached"] = True
                    return LocationIntelligence(**payload)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"location address-cache read failed: {exc}")

    # 1. Geocode if needed
    if lat is None or lng is None:
        if GOOGLE_API_KEY:
            geo = await _geocode_google(address_input)
            source_provider = "google"
        else:
            geo = await _geocode_nominatim(address_input)
            source_provider = "openstreetmap"
        if not geo:
            raise ValueError(f"Could not geocode '{address_input}'")
        lat = geo["lat"]; lng = geo["lng"]
        resolved = geo.get("address")
    else:
        resolved = None
        source_provider = "google" if GOOGLE_API_KEY else "openstreetmap"

    # 2. Cache lookup
    cache_key = f"loc:{round(lat, 4)}:{round(lng, 4)}"
    if cache_db is not None:
        try:
            cached = await cache_db["location_cache"].find_one({"key": cache_key}, {"_id": 0})
            if cached:
                gen_at = cached["generated_at"]
                if gen_at.tzinfo is None:
                    gen_at = gen_at.replace(tzinfo=timezone.utc)
                age = datetime.now(timezone.utc) - gen_at
                if age < timedelta(days=30):
                    payload = cached["payload"]
                    payload["cached"] = True
                    return LocationIntelligence(**payload)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"location cache read failed: {exc}")

    # 3. POI fetch
    if GOOGLE_API_KEY:
        buckets = await _places_google(lat, lng)
    else:
        buckets = await _places_overpass(lat, lng)

    # 4. Scoring
    walk    = _score_walkability(buckets)
    tour    = _score_tourism(buckets)
    beach   = _score_beach_marina(buckets)
    conv    = _score_convenience(buckets)
    scores  = LocationScores(
        location=0.0,
        walkability=walk,
        tourism=tour,
        beach_marina=beach,
        convenience=conv,
    )
    scores.location = _composite_score(scores)

    # 5. Drivers / weaknesses / notes
    dw    = _build_drivers_weaknesses(buckets, scores)
    notes = _noise_risk_notes(buckets)

    # 6. Travel summary: pick nearest POI per important category
    summary_cats = ["restaurant", "cafe", "supermarket", "metro", "beach",
                    "marina", "landmark", "hospital", "airport"]
    summary: List[POIItem] = []
    for c in summary_cats:
        if buckets[c]:
            summary.append(buckets[c][0])

    out = LocationIntelligence(
        address_input=address_input,
        resolved_address=resolved,
        lat=lat, lng=lng,
        scores=scores,
        verdict=_verdict(scores.location),
        top_drivers=dw["drivers"],
        top_weaknesses=dw["weaknesses"],
        noise_risk_notes=notes,
        nearby_counts={k: len(v) for k, v in buckets.items()},
        travel_summary=summary,
        source=source_provider,
        generated_at=datetime.now(timezone.utc),
        cached=False,
    )

    # 7. Cache write
    if cache_db is not None:
        try:
            doc = {
                "key": cache_key,
                "address_key": (address or "").strip().lower() if address else None,
                "lat": lat, "lng": lng,
                "generated_at": out.generated_at,
                "payload": out.model_dump(),
            }
            await cache_db["location_cache"].update_one(
                {"key": cache_key},
                {"$set": doc},
                upsert=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"location cache write failed: {exc}")

    return out
