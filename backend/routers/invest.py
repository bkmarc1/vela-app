"""Propul8 · INVEST router (iter66 refactor).

Hospitality Acquisition Intelligence — deterministic investor-grade pipeline.
Same input always yields the same output (no LLM in the hot path so
/invest/analyze stays sub-200ms). Frontend mirrors the math in
`lib/investIntelligence.js` so the demo route never depends on the API.

All endpoints in this file are prefixed with /api.
"""
from __future__ import annotations

import os
import re
import json
import uuid
import base64
import logging
import requests
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


logger = logging.getLogger("propul8.invest")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Mongo client injected by server.py at module-import time.
_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api", tags=["invest"])


# Shared helpers from server.py — imported lazily inside endpoint bodies to
# avoid the circular import at module-parse time. server.py imports this
# router at the bottom (after _scrape_listing / _slug_hints / _quick_visual_analysis
# are already defined), but Python's import machinery still resolves names
# lazily so the local-import pattern is the safest contract.
# Forward stubs for server-only helpers — resolved at call-time to break
# the circular import (server.py imports this module at the very bottom).
def _scrape_listing(*args, **kwargs):
    from routers.operate import _scrape_listing as _impl
    return _impl(*args, **kwargs)


def _quick_visual_analysis(*args, **kwargs):
    from routers.operate import _quick_visual_analysis as _impl
    return _impl(*args, **kwargs)


def _slug_hints(*args, **kwargs):
    from routers.operate import _slug_hints as _impl
    return _impl(*args, **kwargs)


def _parse_ai_json(*args, **kwargs):
    from server import _parse_ai_json as _impl
    return _impl(*args, **kwargs)


# ---------------------------------------------------------------------------
# Propul8 INVEST — Hospitality Acquisition Intelligence
# ---------------------------------------------------------------------------
# Deterministic investor-grade pipeline. Same input → same output. No LLM in
# the hot path so /invest/analyze stays sub-200ms. Frontend mirrors the math
# in `lib/investIntelligence.js` so demo route never depends on the API.

_INVEST_DEFAULT_ASSUMPTIONS: Dict[str, float] = {
    "airbnb_fee_pct":          0.15,    # platform commission
    "management_fee_pct":      0.18,    # local management
    "cleaning_eur_per_month":  350.0,
    "utilities_eur_per_month": 120.0,
    "internet_eur_per_month":  35.0,
    "vacancy_reserve_pct":     0.08,    # buffer over occupancy already baked
    "maintenance_reserve_pct": 0.06,
    "insurance_pct":           0.004,   # of asking_price annually
    "furnishing_amort_eur":    1800.0,  # €18k furniture over 10y
    "municipality_tax_pct":    0.005,   # of asking_price
    "income_tax_pct":          0.15,    # GR short-stay flat
    "common_expenses_eur_per_month": 60.0,
    "financing_pct":           0.045,   # APR
    "ltv_pct":                 0.60,    # default loan-to-value
}


def _invest_hash(seed: str) -> int:
    h = 2166136261
    for ch in seed:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _invest_clamp(v, lo, hi):
    return max(lo, min(hi, v))


def _extract_asking_price(scraped: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Best-effort €-amount extraction. Returns (value, confidence).
    confidence ∈ {'verified', 'needs_review', 'missing'}.
    'verified' only when JSON-LD or schema.org structured price is present.
    Free-text regex extractions are 'needs_review' — Propul8 does NOT calculate
    from these without explicit user confirmation."""
    # 0) Spitogatos __NEXT_DATA__ payload — highest trust for Spitogatos.
    spito = scraped.get("_spito") or {}
    if spito.get("price"):
        try:
            n = int(float(str(spito["price"]).replace(",", "").replace("€", "").strip()))
            if 30_000 <= n <= 50_000_000:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    # 1) JSON-LD schema.org price (highest trust).
    # Walk every dict and recursively check `offers`, `priceSpecification`,
    # and bare `price` keys to support every E&V / Idealista / Rightmove shape.
    def _walk_price(node):
        if isinstance(node, dict):
            # Direct price field
            if "price" in node:
                p = node.get("price")
                if isinstance(p, (int, float, str)) and not isinstance(p, bool):
                    yield p
            # priceSpecification.price
            ps = node.get("priceSpecification")
            if isinstance(ps, dict):
                if ps.get("price"):
                    yield ps["price"]
                if ps.get("minPrice"):
                    yield ps["minPrice"]
            # offers (Offer | AggregateOffer | list)
            offers = node.get("offers")
            if offers is not None:
                if isinstance(offers, list):
                    for o in offers:
                        yield from _walk_price(o)
                else:
                    yield from _walk_price(offers)
            # Recurse into nested dicts
            for k, v in node.items():
                if k in ("price", "priceSpecification", "offers"):
                    continue
                if isinstance(v, (dict, list)):
                    yield from _walk_price(v)
        elif isinstance(node, list):
            for x in node:
                yield from _walk_price(x)

    for ld in (scraped.get("json_ld") or []):
        for raw in _walk_price(ld):
            try:
                # Strip currency symbols + thousands separators safely.
                s = re.sub(r"[€$£\s]", "", str(raw)).replace(",", "")
                n = int(float(s))
                if 30_000 <= n <= 50_000_000:
                    return n, "verified"
            except (TypeError, ValueError):
                continue

    # 2) OG / meta product:price tags (high trust)
    og = scraped.get("og") or {}
    for key in ("product:price:amount", "price", "og:price:amount"):
        if og.get(key):
            try:
                n = int(float(str(og[key]).replace(",", "").replace(" ", "")))
                if 30_000 <= n <= 50_000_000:
                    return n, "verified"
            except (TypeError, ValueError):
                pass

    # 3) Free-text regex — needs_review. Handles € 1.180.000, EUR 850,000,
    # and standalone "850 000 €" with thin or non-breaking spaces.
    blob = " ".join([
        str(scraped.get("title") or ""),
        str(scraped.get("description") or ""),
        " ".join([str(v) for v in og.values()]),
        str(scraped.get("raw_text") or ""),
    ])[:14000]
    if not blob:
        return None, "missing"
    candidates = []
    pattern = r"(?:€|EUR\b|\$|USD\b|AED\b)\s*([\d][\d.,\s\u00A0\u202F]{2,14})"
    for m in re.finditer(pattern, blob, re.IGNORECASE):
        raw = re.sub(r"[\s\u00A0\u202F]", "", m.group(1)).replace(",", "").replace(".", "")
        try:
            n = int(raw)
            if 30_000 <= n <= 50_000_000:
                candidates.append(n)
        except ValueError:
            pass
    if not candidates:
        return None, "missing"
    big = [c for c in candidates if c >= 30_000] or candidates
    big.sort()
    return big[len(big) // 2], "needs_review"


def _extract_m2(scraped: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Multi-layer m² extraction.

    Layer 1: JSON-LD floorSize (schema.org QuantitativeValue) — verified.
    Layer 2: title regex with broad sqm patterns — verified if 2+ matches agree.
    Layer 3: raw_text regex — needs_review.
    """
    # Layer 0 — Spitogatos __NEXT_DATA__
    spito = scraped.get("_spito") or {}
    if spito.get("size"):
        try:
            n = int(float(str(spito["size"]).replace(",", ".")))
            if 18 <= n <= 5000:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    # Layer 1 — JSON-LD floorSize
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        fs = ld.get("floorSize")
        if isinstance(fs, dict):
            val = fs.get("value") or fs.get("@value")
            if val:
                try:
                    n = int(float(str(val).replace(",", ".")))
                    if 18 <= n <= 5000:
                        return n, "verified"
                except (TypeError, ValueError):
                    pass
        for k in ("size", "area"):
            v = ld.get(k)
            if isinstance(v, (int, float)) and 18 <= int(v) <= 5000:
                return int(v), "verified"

    # Layer 2 + 3 — regex over title + raw_text
    title = str(scraped.get("title") or "")
    blob = " ".join([title, str(scraped.get("raw_text") or "")])[:12000]
    if not blob:
        return None, "missing"
    candidates = []
    # Broadened patterns: m², m2, sqm, sq m, sq.m., sqft, square meters,
    # τμ, τ.μ., τετραγωνικά μέτρα.
    pattern = (
        r"(\d{2,4}(?:[.,]\d{1,2})?)\s*"
        r"(?:m²|m2|sqm|sq[\s.]*m\.?|square[\s-]*met(?:re|er)s?|"
        r"τ[\s.]*μ\.?|τετραγωνικ)"
    )
    for m in re.finditer(pattern, blob, re.IGNORECASE):
        try:
            n = int(float(m.group(1).replace(",", ".")))
            if 18 <= n <= 5000:
                candidates.append(n)
        except ValueError:
            pass
    if not candidates:
        return None, "missing"
    # Multiple matches with same value → verified. Single regex hit with the
    # value also appearing in the title → verified. Else needs_review.
    from collections import Counter
    most_common, count = Counter(candidates).most_common(1)[0]
    title_match = re.search(pattern, title, re.IGNORECASE)
    title_value = None
    if title_match:
        try:
            title_value = int(float(title_match.group(1).replace(",", ".")))
        except ValueError:
            pass
    if count >= 2 or (title_value == most_common):
        return most_common, "verified"
    return most_common, "needs_review"


def _extract_bedrooms(scraped: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Multi-layer bedrooms extraction.

    Layer 1: JSON-LD numberOfBedrooms / numberOfRooms — verified.
    Layer 2: title regex (e.g. "3 bedroom villa") — verified.
    Layer 3: raw_text regex — needs_review.
    """
    # Layer 0 — Spitogatos __NEXT_DATA__
    spito = scraped.get("_spito") or {}
    if spito.get("rooms"):
        try:
            n = int(float(str(spito["rooms"])))
            if 1 <= n <= 12:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    # Layer 1 — JSON-LD
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        for k in ("numberOfBedrooms", "numberOfRooms", "numberOfBedRooms"):
            v = ld.get(k)
            if isinstance(v, (int, float, str)):
                try:
                    n = int(float(str(v)))
                    if 1 <= n <= 12:
                        return n, "verified"
                except (TypeError, ValueError):
                    pass

    title = str(scraped.get("title") or "")
    blob = " ".join([title, str(scraped.get("raw_text") or "")])[:12000]
    if not blob:
        return None, "missing"
    pattern = r"(\d{1,2})\s*(?:bed(?:rooms?)?|br\b|bdrm|chambres?|"\
              r"υπνοδωμάτι|κρεβατοκάμαρ|dormit)"
    title_match = re.search(pattern, title, re.IGNORECASE)
    if title_match:
        try:
            n = int(title_match.group(1))
            if 1 <= n <= 12:
                return n, "verified"
        except ValueError:
            pass
    for m in re.finditer(pattern, blob, re.IGNORECASE):
        try:
            n = int(m.group(1))
            if 1 <= n <= 12:
                return n, "needs_review"
        except ValueError:
            pass
    return None, "missing"


def _extract_bathrooms(scraped: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Multi-layer bathrooms extraction (mirrors _extract_bedrooms)."""
    spito = scraped.get("_spito") or {}
    if spito.get("bathrooms"):
        try:
            n = int(float(str(spito["bathrooms"])))
            if 1 <= n <= 8:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        for k in ("numberOfBathroomsTotal", "numberOfBathrooms", "numberOfFullBathrooms"):
            v = ld.get(k)
            if isinstance(v, (int, float, str)):
                try:
                    n = int(float(str(v)))
                    if 1 <= n <= 8:
                        return n, "verified"
                except (TypeError, ValueError):
                    pass
    blob = " ".join([
        str(scraped.get("title") or ""),
        str(scraped.get("raw_text") or "")[:12000],
    ])
    if not blob.strip():
        return None, "missing"
    for m in re.finditer(r"(\d{1,2})\s*(?:bath(?:rooms?)?|wc\b|μπάνι|baño)", blob, re.IGNORECASE):
        try:
            n = int(m.group(1))
            if 1 <= n <= 8:
                return n, "needs_review"
        except ValueError:
            pass
    return None, "missing"


def _extract_floor(scraped: Dict[str, Any]) -> Tuple[Optional[str], str]:
    blob = str(scraped.get("raw_text") or "")[:5000]
    if not blob:
        return None, "missing"
    m = re.search(r"(?:floor|όροφος)\s*[:\-]?\s*(\d{1,2}(?:st|nd|rd|th)?|ground|γ)", blob, re.IGNORECASE)
    if m:
        return m.group(1), "needs_review"
    return None, "missing"


def _extract_energy_class(scraped: Dict[str, Any]) -> Tuple[Optional[str], str]:
    blob = str(scraped.get("raw_text") or "")[:6000]
    if not blob:
        return None, "missing"
    m = re.search(r"(?:energy(?: class| rating)?|ενεργειακή)\s*[:\-]?\s*([A-G][\+\-]?)", blob, re.IGNORECASE)
    if m:
        return m.group(1).upper(), "needs_review"
    return None, "missing"


def _extract_parking(scraped: Dict[str, Any]) -> Tuple[Optional[bool], str]:
    blob = str(scraped.get("raw_text") or "")[:6000].lower()
    if not blob:
        return None, "missing"
    if "no parking" in blob or "without parking" in blob:
        return False, "needs_review"
    if any(k in blob for k in ("parking", "garage", "θέση στάθμευσης", "πάρκινγκ")):
        return True, "needs_review"
    return None, "missing"


def _extract_condition(scraped: Dict[str, Any], url: str) -> Tuple[Optional[str], str]:
    """Maps to renovation_state: pristine | refresh | renovation | gut.

    Reads title + description + raw_text + URL slug. Recognizes English,
    Greek, and a few common Spanish/Portuguese variants.
    """
    blob = " ".join([
        str(scraped.get("title") or ""),
        str(scraped.get("description") or ""),
        str(scraped.get("raw_text") or "")[:6000],
        url,
    ]).lower()
    if not blob.strip():
        return None, "missing"
    # Pristine — newly built / new construction (highest trust signal).
    if any(k in blob for k in (
        "newly built", "new construction", "newly constructed", "brand new",
        "νεόδμητο", "καινούργ",
    )):
        return "pristine", "verified"
    # Refresh — fully / recently / newly renovated.
    if any(k in blob for k in (
        "fully renovated", "newly renovated", "recently renovated",
        "renovated in 20", "renovated 20", "full renovation completed",
        "πλήρως ανακαινισμέν", "πρόσφατα ανακαινισμέν", "ανακαινισμέν",
    )):
        return "refresh", "verified"
    # Renovation needed.
    if any(k in blob for k in (
        "needs renovation", "to renovate", "fixer", "fixer-upper",
        "for renovation", "in need of renovation", "requires renovation",
        "χρειάζεται ανακαίνιση", "για ανακαίνιση",
    )):
        return "renovation", "needs_review"
    # Generic "renovated" without modifier — softer signal.
    if "renovated" in blob:
        return "refresh", "needs_review"
    return None, "missing"


def _extract_year_built(scraped: Dict[str, Any]) -> Tuple[Optional[int], str]:
    """Year of construction. Reads JSON-LD yearBuilt + free-text patterns."""
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        for k in ("yearBuilt", "constructionYear", "dateCreated"):
            v = ld.get(k)
            if isinstance(v, (int, float, str)):
                try:
                    n = int(float(str(v).split("-")[0]))
                    if 1850 <= n <= 2030:
                        return n, "verified"
                except (TypeError, ValueError):
                    pass
    blob = " ".join([
        str(scraped.get("title") or ""),
        str(scraped.get("description") or ""),
        str(scraped.get("raw_text") or "")[:6000],
    ])
    if not blob.strip():
        return None, "missing"
    pattern = (
        r"(?:built\s*(?:in)?|construction\s*(?:year|date)|year\s*built|"
        r"originally\s*built\s*in|κατασκευ[άή]\s*(?:το)?)\s*[:\-]?\s*"
        r"(18\d{2}|19\d{2}|20[0-3]\d)"
    )
    m = re.search(pattern, blob, re.IGNORECASE)
    if m:
        try:
            n = int(m.group(1))
            if 1850 <= n <= 2030:
                return n, "needs_review"
        except ValueError:
            pass
    return None, "missing"


def _extract_neighborhood(scraped: Dict[str, Any]) -> Tuple[Optional[str], str]:
    """Granular location (e.g. 'Adames, Kifissia', 'Plaka', 'Glyfada').

    Reads JSON-LD address.addressLocality / addressRegion first, then falls
    back to title parsing ('… in <Neighborhood>').
    """
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        addr = ld.get("address")
        if isinstance(addr, dict):
            parts = []
            for k in ("addressLocality", "streetAddress", "addressRegion"):
                v = addr.get(k)
                if isinstance(v, str) and 2 < len(v) < 80:
                    parts.append(v.strip())
            if parts:
                return ", ".join(parts[:2])[:120], "verified"
    title = str(scraped.get("title") or "")
    # Common pattern: "<sqm> sqm <type> in <Neighborhood>, <City>"
    m = re.search(r"\bin\s+([A-ZΑΒΓΔ][A-Za-zΑ-Ωα-ω\u00C0-\u017F .'-]{2,40})", title)
    if m:
        return m.group(1).strip().rstrip(".,"), "needs_review"
    return None, "missing"


def _extract_description(scraped: Dict[str, Any]) -> Tuple[Optional[str], str]:
    """Listing description (1-3 sentences). JSON-LD then OG description."""
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        d = ld.get("description")
        if isinstance(d, str) and 60 < len(d) < 4000:
            return d.strip()[:1200], "verified"
    desc = scraped.get("description")
    if isinstance(desc, str) and 60 < len(desc) < 4000:
        return desc.strip()[:1200], "verified"
    return None, "missing"


_BOT_BLOCK_TITLE_SIGNALS = (
    "pardon our interruption", "just a moment", "access denied",
    "are you a robot", "captcha", "checking your browser",
    "request unsuccessful", "ddos-guard",
)


def _clean_title(title: str, city: Optional[str]) -> Optional[str]:
    """Strip out anti-bot interstitial titles. Anything matching a known
    block signal gets replaced with a clean fallback so Propul8 never displays
    'Pardon Our Interruption' as the asset name."""
    if not title:
        return None
    low = title.lower()
    if any(s in low for s in _BOT_BLOCK_TITLE_SIGNALS):
        return f"{city} Listing" if city else "Imported Listing"
    return title[:200]



def _detect_listing_source(url: str) -> str:
    u = url.lower()
    if "engelvoelkers" in u or "engel-voelkers" in u:
        return "Engel & Völkers"
    if "spitogatos" in u:
        return "Spitogatos"
    if "sothebysrealty" in u or "sothebys" in u:
        return "Sotheby's International Realty"
    if "ss.lv" in u or "ss.com" in u:
        return "SS.lv"
    if "propertyfinder" in u:
        return "Property Finder"
    if "airbnb." in u:
        return "Airbnb"
    if "booking." in u:
        return "Booking.com"
    if "xe.gr" in u:
        return "XE"
    if "idealista" in u:
        return "Idealista"
    return "Listing source"


def _detect_city(scraped: Dict[str, Any], url: str) -> str:
    """City detection — JSON-LD address first, then text + URL slug fallback."""
    # Layer 0 — Spitogatos __NEXT_DATA__
    spito = scraped.get("_spito") or {}
    if spito.get("city") and isinstance(spito["city"], str):
        return spito["city"].strip().split(",")[0][:60]
    # Layer 1 — JSON-LD address.addressLocality (when it matches a known city).
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        addr = ld.get("address")
        if isinstance(addr, dict):
            for k in ("addressLocality", "addressRegion"):
                v = addr.get(k)
                if isinstance(v, str):
                    return v.strip().split(",")[0][:60]
    blob = " ".join([
        str(scraped.get("title") or ""),
        str(scraped.get("description") or ""),
        url, str(scraped.get("raw_text") or "")[:2500],
    ]).lower()
    for needle, name in [
        ("kifiss", "Athens"), ("kifisi", "Athens"), ("glyfada", "Athens"),
        ("kolonaki", "Athens"), ("plaka", "Athens"), ("koukaki", "Athens"),
        ("athens", "Athens"), ("αθήν", "Athens"), ("athina", "Athens"),
        ("thessalon", "Thessaloniki"), ("paros", "Paros"), ("naxos", "Naxos"),
        ("mykono", "Mykonos"), ("santor", "Santorini"), ("koufonisi", "Koufonisia"),
        ("antiparo", "Antiparos"), ("crete", "Crete"), ("κρήτ", "Crete"),
        ("rhodes", "Rhodes"), ("riga", "Riga"), ("dubai", "Dubai"),
        ("london", "London"), ("paris", "Paris"), ("milan", "Milan"),
        ("madrid", "Madrid"), ("barcelona", "Barcelona"), ("ibiza", "Ibiza"),
        ("lisbon", "Lisbon"), ("comporta", "Comporta"), ("porto", "Porto"),
    ]:
        if needle in blob:
            return name
    return "Mediterranean"


class InvestIngestRequest(BaseModel):
    url: str
    asking_price_eur: Optional[int] = None
    m2: Optional[int] = None
    rooms: Optional[int] = None
    city: Optional[str] = None


@router.post("/invest/ingest")
async def invest_ingest(payload: InvestIngestRequest):
    """Hybrid scrape — extracts listing data with per-field confidence.

    Multi-layer extraction pipeline:
      Layer 1: JSON-LD / schema.org RealEstateListing structured data
      Layer 2: OpenGraph + meta tags
      Layer 3: Title + description regex
      Layer 4: Page-text regex fallback
      Layer 5: Manual completion (frontend VerifyChecklist)

    Critical fields (price, sqm, bedrooms, location) return null when
    extraction confidence is low. Propul8 INVEST gates analysis on user
    verification of these fields.
    """
    url = (payload.url or "").strip()
    if not url.startswith("http"):
        raise HTTPException(400, "Provide a full https:// URL")
    scraped = _scrape_listing(url)

    price_v, price_c       = _extract_asking_price(scraped)
    m2_v,    m2_c          = _extract_m2(scraped)
    beds_v,  beds_c        = _extract_bedrooms(scraped)
    baths_v, baths_c       = _extract_bathrooms(scraped)
    floor_v, floor_c       = _extract_floor(scraped)
    energy_v, energy_c     = _extract_energy_class(scraped)
    parking_v, parking_c   = _extract_parking(scraped)
    cond_v,  cond_c        = _extract_condition(scraped, url)
    year_v,  year_c        = _extract_year_built(scraped)
    nbhd_v,  nbhd_c        = _extract_neighborhood(scraped)
    desc_v,  desc_c        = _extract_description(scraped)

    # User-supplied fields always override and are marked verified.
    if payload.asking_price_eur:
        price_v, price_c = payload.asking_price_eur, "user_verified"
    if payload.m2:
        m2_v, m2_c = payload.m2, "user_verified"
    if payload.rooms:
        beds_v, beds_c = payload.rooms, "user_verified"

    detected_city = _detect_city(scraped, url)
    if payload.city:
        city_v, city_c = payload.city.strip(), "user_verified"
    elif detected_city != "Mediterranean":
        # Confidence depends on whether JSON-LD address.addressLocality fired.
        city_c = "verified" if any(
            isinstance(ld, dict) and isinstance(ld.get("address"), dict)
            and ld["address"].get("addressLocality")
            for ld in (scraped.get("json_ld") or [])
        ) else "needs_review"
        city_v = detected_city
    else:
        city_v, city_c = None, "missing"

    # Property type — JSON-LD @type first, then heuristic from URL slug + title.
    ptype, ptype_c = None, "missing"
    for ld in (scraped.get("json_ld") or []):
        if not isinstance(ld, dict):
            continue
        t = ld.get("@type")
        types = t if isinstance(t, list) else [t]
        for tt in types:
            if not isinstance(tt, str):
                continue
            ttl = tt.lower()
            if "singlefamilyresidence" in ttl or ttl in ("house",):
                ptype, ptype_c = "Villa", "verified"
                break
            if ttl == "apartment":
                ptype, ptype_c = "Apartment", "verified"
                break
        if ptype_c == "verified":
            break
    if ptype_c == "missing":
        blob = (scraped.get("title", "") + " " + (scraped.get("description") or "") + " " + url).lower()
        if any(k in blob for k in ("villa", "house", "maison", "βίλα", "detached", "monokatoik")):
            ptype, ptype_c = "Villa", "needs_review"
        elif any(k in blob for k in ("loft", "penthouse", "duplex")):
            ptype, ptype_c = "Loft", "needs_review"
        elif any(k in blob for k in ("studio", "garçonn")):
            ptype, ptype_c = "Studio", "needs_review"
        elif "apartment" in blob or "apt" in blob or "διαμέρισμα" in blob:
            ptype, ptype_c = "Apartment", "needs_review"

    listing_source = _detect_listing_source(url)

    # If the scraper hit an anti-bot interstitial, mark every still-empty
    # confidence flag as 'source_blocked' so the UI shows "Source blocked"
    # rather than "Not confirmed". User can fill the fields manually.
    bot_blocked = bool(scraped.get("bot_blocked"))
    def _blk(value, conf):
        if bot_blocked and (value is None or value == "") and conf == "missing":
            return "source_blocked"
        return conf
    price_c   = _blk(price_v, price_c)
    m2_c      = _blk(m2_v, m2_c)
    beds_c    = _blk(beds_v, beds_c)
    baths_c   = _blk(baths_v, baths_c)
    floor_c   = _blk(floor_v, floor_c)
    energy_c  = _blk(energy_v, energy_c)
    parking_c = _blk(parking_v, parking_c)
    cond_c    = _blk(cond_v, cond_c)
    year_c    = _blk(year_v, year_c)
    nbhd_c    = _blk(nbhd_v, nbhd_c)
    desc_c    = _blk(desc_v, desc_c)
    city_c    = _blk(city_v, city_c)
    ptype_c   = _blk(ptype, ptype_c)

    # Price-per-sqm — derived field, only when both price and m² are usable.
    price_per_sqm_v: Optional[int] = None
    price_per_sqm_c = "missing"
    if isinstance(price_v, (int, float)) and isinstance(m2_v, (int, float)) and m2_v > 0:
        price_per_sqm_v = int(round(price_v / m2_v))
        # Inherit lowest confidence of the two inputs.
        if price_c == "verified" and m2_c == "verified":
            price_per_sqm_c = "verified"
        elif "missing" in (price_c, m2_c):
            price_per_sqm_c = "missing"
        else:
            price_per_sqm_c = "needs_review"

    return {
        "url": url,
        "title":             _clean_title(scraped.get("title") or "", city_v),
        "city":              city_v,
        "neighborhood":      nbhd_v,
        "description":       desc_v,
        "asking_price_eur":  price_v,
        "price_per_sqm_eur": price_per_sqm_v,
        "m2":                m2_v,
        "rooms":             beds_v,            # bedrooms / rooms
        "bathrooms":         baths_v,
        "floor":             floor_v,
        "energy_class":      energy_v,
        "parking":           parking_v,
        "year_built":        year_v,
        "renovation_state":  cond_v,
        "property_type":     ptype,
        "listing_source":    listing_source,
        "images":            scraped.get("images") or [],
        "raw_excerpt":       (scraped.get("raw_text") or "")[:1200],
        "bot_blocked":       bot_blocked,

        # Per-field confidence: 'verified' | 'needs_review' | 'missing' | 'user_verified' | 'source_blocked'
        "_confidence": {
            "asking_price_eur":  price_c,
            "price_per_sqm_eur": price_per_sqm_c,
            "m2":                m2_c,
            "city":              city_c,
            "neighborhood":      nbhd_c,
            "description":       desc_c,
            "rooms":             beds_c,
            "bathrooms":         baths_c,
            "floor":             floor_c,
            "energy_class":      energy_c,
            "parking":           parking_c,
            "year_built":        year_c,
            "renovation_state":  cond_c,
            "property_type":     ptype_c,
            "listing_source":    "verified",        # derived from the URL itself
            "url":               "verified",
        },

        # Developer-grade extraction transparency. Surfaces what fired so the
        # /Confirm Property Data debug panel can show the audit trail.
        "extraction_debug": {
            "http_status":       scraped.get("http_status"),
            "bot_blocked":       bot_blocked,
            "extraction_layers": scraped.get("extraction_layers") or [],
            "json_ld_count":     len(scraped.get("json_ld") or []),
            "og_keys":           list((scraped.get("og") or {}).keys()),
            "spito_signals":     scraped.get("_spito") or {},
            "title_seen":        scraped.get("title") or "",
        },
    }


# ---------------------------------------------------------------------------
# /invest/parse-text  &  /invest/parse-screenshot
# ---------------------------------------------------------------------------
# Fallback parsers for when a URL is bot-blocked. The user pastes raw listing
# text OR uploads up to 3 screenshots; Claude Sonnet 4.5 extracts structured
# property facts. Output mirrors /invest/ingest so the frontend can route the
# response through the same ConfirmPropertyData flow.
#
# We never invent values — Claude is instructed to use null when a field isn't
# clearly stated. Each populated field's confidence is tagged 'user_pasted_text'
# or 'user_screenshot' so the DataBadge layer renders "Extracted from pasted
# text" / "Extracted from screenshot" instead of "Verified".

class InvestParseTextRequest(BaseModel):
    listing_text: str
    source_url: Optional[str] = None


_PARSE_SYSTEM_PROMPT = (
    "You are Propul8's listing parser. Extract structured property facts "
    "from raw real-estate / short-term-rental listing content. "
    "Return ONLY a JSON object with these fields:\n"
    "{\n"
    '  "title": string | null,\n'
    '  "city": string | null,\n'
    '  "neighborhood": string | null,\n'
    '  "asking_price_eur": integer | null,\n'
    '  "m2": integer | null,\n'
    '  "rooms": integer | null,             // bedrooms\n'
    '  "bathrooms": integer | null,\n'
    '  "year_built": integer | null,\n'
    '  "property_type": string | null,      // Apartment / Villa / House / Loft / Studio / Penthouse\n'
    '  "floor": string | null,\n'
    '  "energy_class": string | null,\n'
    '  "renovation_state": string | null,   // pristine / refresh / renovation / gut\n'
    '  "pool": boolean | null,\n'
    '  "garden": boolean | null,\n'
    '  "description": string | null,\n'
    '  "amenities": string[] | null\n'
    "}\n"
    "STRICT RULES:\n"
    "1. NEVER invent values. If a field is not clearly stated, return null.\n"
    "2. Numbers must be integers (no commas, no currency symbol).\n"
    "3. For pool/garden: only set true/false when text explicitly mentions it; otherwise null.\n"
    "4. property_type must be one of the enum values above (or null).\n"
    "5. Return raw JSON only — no markdown fences, no commentary."
)


async def _ai_parse_listing(text_blocks: List[Dict[str, Any]],
                            session_prefix: str) -> Dict[str, Any]:
    """Run Claude Sonnet 4.5 over text + (optional) images. text_blocks is a
    list of {type: 'text'|'image', content: str|base64} entries that gets
    forwarded as a single UserMessage."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"propos-parse-{session_prefix}-{uuid.uuid4().hex[:6]}",
        system_message=_PARSE_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Build the UserMessage. Claude vision accepts mixed text + image content.
    text_parts = [b["content"] for b in text_blocks if b["type"] == "text"]
    image_parts = [
        ImageContent(image_base64=b["content"]) for b in text_blocks if b["type"] == "image"
    ]
    msg = UserMessage(text="\n\n".join(text_parts) or "Extract property facts.",
                      file_contents=image_parts or None)
    raw = await chat.send_message(msg)
    return _parse_ai_json(raw)


def _build_response_from_ai(parsed: Dict[str, Any],
                            source_url: Optional[str],
                            confidence_tag: str,
                            mode_label: str) -> Dict[str, Any]:
    """Translate Claude output into the same shape as /invest/ingest so the
    Confirm screen + DataBadge layer can render it uniformly."""
    def _flag(value) -> str:
        if value is None or value == "" or value == []:
            return "missing"
        return confidence_tag

    return {
        "url":               source_url or "",
        "title":             parsed.get("title"),
        "city":              parsed.get("city"),
        "neighborhood":      parsed.get("neighborhood"),
        "description":       parsed.get("description"),
        "asking_price_eur":  parsed.get("asking_price_eur"),
        "price_per_sqm_eur": (
            round(parsed["asking_price_eur"] / parsed["m2"])
            if parsed.get("asking_price_eur") and parsed.get("m2") else None
        ),
        "m2":                parsed.get("m2"),
        "rooms":             parsed.get("rooms"),
        "bathrooms":         parsed.get("bathrooms"),
        "floor":             parsed.get("floor"),
        "energy_class":      parsed.get("energy_class"),
        "parking":           None,
        "year_built":        parsed.get("year_built"),
        "renovation_state":  parsed.get("renovation_state"),
        "property_type":     parsed.get("property_type"),
        "pool":              parsed.get("pool"),
        "garden":            parsed.get("garden"),
        "listing_source":    mode_label,
        "images":            [],
        "raw_excerpt":       (parsed.get("description") or "")[:1200],
        "bot_blocked":       False,

        "_confidence": {
            "asking_price_eur":  _flag(parsed.get("asking_price_eur")),
            "price_per_sqm_eur": "calculated" if (parsed.get("asking_price_eur") and parsed.get("m2")) else "missing",
            "m2":                _flag(parsed.get("m2")),
            "city":              _flag(parsed.get("city")),
            "neighborhood":      _flag(parsed.get("neighborhood")),
            "description":       _flag(parsed.get("description")),
            "rooms":             _flag(parsed.get("rooms")),
            "bathrooms":         _flag(parsed.get("bathrooms")),
            "floor":             _flag(parsed.get("floor")),
            "energy_class":      _flag(parsed.get("energy_class")),
            "parking":           "missing",
            "year_built":        _flag(parsed.get("year_built")),
            "renovation_state":  _flag(parsed.get("renovation_state")),
            "property_type":     _flag(parsed.get("property_type")),
            "pool":              _flag(parsed.get("pool")),
            "garden":            _flag(parsed.get("garden")),
            "listing_source":    "user_verified",
            "url":               "user_verified" if source_url else "missing",
            "title":             _flag(parsed.get("title")),
        },

        "extraction_debug": {
            "http_status":       None,
            "bot_blocked":       False,
            "extraction_layers": [mode_label.lower().replace(" ", "_")],
            "json_ld_count":     0,
            "og_keys":           [],
            "spito_signals":     {},
            "title_seen":        parsed.get("title") or "",
        },
    }


@router.post("/invest/parse-text")
async def invest_parse_text(payload: InvestParseTextRequest):
    """Parse pasted listing text into structured property facts via Claude
    Sonnet 4.5. Returns the same shape as /invest/ingest so the frontend
    Confirm screen can consume it directly."""
    text = (payload.listing_text or "").strip()
    if len(text) < 40:
        raise HTTPException(400, "Listing text too short to parse (min 40 chars)")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Parser unavailable: AI key missing")
    try:
        parsed = await _ai_parse_listing(
            [{"type": "text", "content": text}],
            session_prefix="text",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"parse-text failed: {exc}")
        raise HTTPException(502, "Parser failed — try again or paste cleaner text")
    return _build_response_from_ai(
        parsed,
        source_url=payload.source_url,
        confidence_tag="user_pasted_text",
        mode_label="Pasted text",
    )


class InvestParseScreenshotRequest(BaseModel):
    images_base64: List[str]                # raw base64 strings, max 3
    source_url: Optional[str] = None
    note: Optional[str] = None              # optional user hint, e.g. city


@router.post("/invest/parse-screenshot")
async def invest_parse_screenshot(payload: InvestParseScreenshotRequest):
    """Parse up to 3 listing screenshots via Claude Sonnet 4.5 vision.
    Same response contract as /invest/parse-text."""
    if not payload.images_base64:
        raise HTTPException(400, "Provide at least one screenshot")
    if len(payload.images_base64) > 3:
        raise HTTPException(400, "Maximum 3 screenshots per request")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Parser unavailable: AI key missing")
    blocks: List[Dict[str, Any]] = []
    if payload.note:
        blocks.append({"type": "text", "content": f"User hint: {payload.note}"})
    blocks.append({"type": "text", "content": (
        "These are listing screenshots. Extract every visible property fact."
    )})
    for img_b64 in payload.images_base64:
        # Strip data: prefix if present.
        if "," in img_b64 and img_b64.startswith("data:"):
            img_b64 = img_b64.split(",", 1)[1]
        blocks.append({"type": "image", "content": img_b64})
    try:
        parsed = await _ai_parse_listing(blocks, session_prefix="screenshot")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"parse-screenshot failed: {exc}")
        raise HTTPException(502, "Vision parser failed — try clearer screenshots")
    return _build_response_from_ai(
        parsed,
        source_url=payload.source_url,
        confidence_tag="user_screenshot",
        mode_label="Screenshot",
    )


# ---------------------------------------------------------------------------
# /invest/parse-brochure — PDF developer brochure extractor
# ---------------------------------------------------------------------------
# Heavy-lift fallback for new-build / off-plan developer brochures (PDF).
# Pipeline: pypdf → raw text → Claude Sonnet 4.5 with an off-plan-aware prompt
# that *also* asks whether the project is currently under construction (off
# plan) or completed/ready-to-move-in. The response carries an extra
# `is_off_plan` boolean alongside the standard property facts so the frontend
# can render an "Off-Plan" vs "Ready" badge on the result page.

class InvestParseBrochureRequest(BaseModel):
    file_base64: str
    source_url: Optional[str] = None
    note: Optional[str] = None


_BROCHURE_SYSTEM_PROMPT = _PARSE_SYSTEM_PROMPT.rstrip(".") + (
    "\n\nADDITIONAL FIELDS FOR DEVELOPER BROCHURES:\n"
    "{\n"
    '  "is_off_plan": boolean | null,           // true if the project is still under '
    "construction / pre-completion / off-plan; false if completed / ready-to-move-in; "
    "null if unclear\n"
    '  "completion_year": integer | null,       // expected handover year if mentioned\n'
    '  "developer_name": string | null,\n'
    '  "project_name": string | null,\n'
    '  "price_from_eur": integer | null,        // starting price across all units\n'
    '  "price_to_eur": integer | null,          // top price across all units\n'
    '  "unit_count": integer | null,            // number of units in the project\n'
    "}\n"
    "Set is_off_plan=true if you see ANY of: 'off-plan', 'off plan', 'pre-construction', "
    "'under construction', 'delivery 202X', 'completion 202X', 'phase 1/2/3', "
    "'reservation', 'available for sale before completion'. "
    "Set is_off_plan=false if you see: 'ready to move in', 'fully furnished', "
    "'recently completed', 'available immediately'."
)


def _extract_pdf_text(file_b64: str, max_pages: int = 20) -> str:
    """Best-effort text extraction from a base64-encoded PDF. Returns concatenated
    page text capped to ~40k chars so the prompt stays small."""
    import base64
    import io
    from pypdf import PdfReader

    raw = file_b64.split(",", 1)[1] if file_b64.startswith("data:") else file_b64
    try:
        pdf_bytes = base64.b64decode(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Invalid base64 PDF data: {exc}") from exc

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Could not open PDF: {exc}") from exc

    chunks: List[str] = []
    page_limit = min(max_pages, len(reader.pages))
    for i in range(page_limit):
        try:
            chunks.append(reader.pages[i].extract_text() or "")
        except Exception:  # noqa: BLE001
            continue
    text = "\n\n".join(chunks).strip()
    if len(text) > 40_000:
        text = text[:40_000] + "\n\n[truncated]"
    return text


@router.post("/invest/parse-brochure")
async def invest_parse_brochure(payload: InvestParseBrochureRequest):
    """Extract a developer brochure PDF → structured property facts +
    `is_off_plan` flag. Same response contract as /invest/parse-text plus
    extra fields under `_brochure`."""
    if not payload.file_base64:
        raise HTTPException(400, "Provide the brochure PDF as base64")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Parser unavailable: AI key missing")

    pdf_text = _extract_pdf_text(payload.file_base64)
    if not pdf_text or len(pdf_text) < 80:
        raise HTTPException(
            422,
            "Could not extract meaningful text from the PDF. The brochure may be "
            "image-only — try the screenshot uploader instead.",
        )

    blocks = [
        {"type": "text", "content": (
            f"User hint: {payload.note}\n\n" if payload.note else ""
        ) + "This is a developer brochure PDF. Extract all property facts, "
        "AND determine whether the project is off-plan vs ready.\n\n"
        f"BROCHURE TEXT:\n{pdf_text}"},
    ]

    from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"propos-brochure-{uuid.uuid4().hex[:6]}",
        system_message=_BROCHURE_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=blocks[0]["content"])
    try:
        raw = await chat.send_message(msg)
        parsed = _parse_ai_json(raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"parse-brochure failed: {exc}")
        raise HTTPException(502, "Brochure parser failed — try uploading again.")

    base = _build_response_from_ai(
        parsed,
        source_url=payload.source_url,
        confidence_tag="user_brochure",
        mode_label="Developer Brochure",
    )

    # Off-plan extras — attach but never break the existing schema.
    base["is_off_plan"]      = parsed.get("is_off_plan")
    base["completion_year"]  = parsed.get("completion_year")
    base["developer_name"]   = parsed.get("developer_name")
    base["project_name"]     = parsed.get("project_name")
    base["price_from_eur"]   = parsed.get("price_from_eur")
    base["price_to_eur"]     = parsed.get("price_to_eur")
    base["unit_count"]       = parsed.get("unit_count")
    # If asking_price wasn't a single number, surface price_from as the starting
    # price so downstream calculations have a usable headline number.
    if base.get("asking_price_eur") is None and parsed.get("price_from_eur"):
        base["asking_price_eur"]  = parsed["price_from_eur"]
        base["_confidence"]["asking_price_eur"] = "user_brochure"
        if base.get("m2"):
            base["price_per_sqm_eur"] = round(parsed["price_from_eur"] / base["m2"])
            base["_confidence"]["price_per_sqm_eur"] = "calculated"
    return base



@router.put("/invest/draft/{draft_id}")
async def invest_update_draft(draft_id: str, payload: Dict[str, Any]):
    """User-verified updates to a server-side draft. Marks every supplied
    field's confidence as 'user_verified' so downstream analysis can trust it.
    """
    existing = await _db["invest_drafts"].find_one({"draft_id": draft_id})
    if not existing:
        raise HTTPException(404, "draft not found or expired")

    confidence = dict(existing.get("_confidence") or {})
    fields = {}
    allowed = {
        "url", "title", "city", "asking_price_eur", "m2", "rooms", "bathrooms",
        "floor", "energy_class", "parking", "renovation_state", "property_type",
        "listing_source", "images", "year_built", "elevator",
    }
    for k, v in (payload or {}).items():
        if k in allowed:
            fields[k] = v
            confidence[k] = "user_verified"

    fields["_confidence"] = confidence
    fields["updated_at"]  = datetime.now(timezone.utc)
    await _db["invest_drafts"].update_one(
        {"draft_id": draft_id},
        {"$set": fields},
    )
    doc = await _db["invest_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


class InvestAnalyzeRequest(BaseModel):
    asset_id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    city: str
    property_type: str
    asking_price_eur: int
    m2: Optional[int] = None
    rooms: Optional[int] = None
    floor: Optional[str] = None
    elevator: Optional[bool] = None
    year_built: Optional[int] = None
    renovation_state: Optional[str] = None  # pristine | refresh | renovation | gut
    images: Optional[List[str]] = None
    assumptions: Optional[Dict[str, float]] = None  # investor overrides


def _compute_invest_intelligence(req: InvestAnalyzeRequest) -> Dict[str, Any]:
    """Single deterministic computation for the entire INVEST dashboard."""
    asset_id = req.asset_id or req.url or req.title or req.city
    h = _invest_hash(f"{asset_id}|{req.city}|{req.asking_price_eur}|{req.property_type}")

    asking = max(20_000, int(req.asking_price_eur))
    m2 = int(req.m2 or max(35, 30 + (h % 90)))
    rooms = int(req.rooms or _invest_clamp(1 + (m2 // 35), 1, 5))
    sleeps = _invest_clamp(rooms + 1, 2, 8)

    market = _invest_market_profile(req.city, req.property_type)

    # Base ADR — anchored to market median, +/- 22% by hash so different
    # assets don't collapse to the same number.
    adr_drift = ((h // 7) % 1000) / 1000.0  # 0..1
    base_adr = int(market["median_adr"] * (0.88 + adr_drift * 0.34))
    base_occ = _invest_clamp(market["median_occupancy"] - 6 + (h % 12), 52, 86)

    # Renovation discount on base ADR
    state = (req.renovation_state or "refresh").lower()
    state_factor = {"pristine": 1.06, "refresh": 1.0, "renovation": 0.88, "gut": 0.74}.get(state, 1.0)
    base_adr = int(base_adr * state_factor)

    # Annual gross
    nights = int(365 * base_occ / 100.0)
    gross_revenue = base_adr * nights

    # True ROI waterfall ──────────────────────────────────────────────────
    a = dict(_INVEST_DEFAULT_ASSUMPTIONS)
    if req.assumptions:
        for k, v in req.assumptions.items():
            if k in a and isinstance(v, (int, float)) and v >= 0:
                a[k] = float(v)

    expenses = []

    def add(label, amount, note=None):
        expenses.append({
            "label": label, "amount_eur": int(round(amount)), "note": note or "",
        })
    add("Airbnb / Booking platform fees", gross_revenue * a["airbnb_fee_pct"], "15% platform commission")
    add("Management fees",                gross_revenue * a["management_fee_pct"], "Local STR operator")
    add("Cleaning",                       a["cleaning_eur_per_month"] * 12)
    add("Utilities",                      a["utilities_eur_per_month"] * 12)
    add("Internet",                       a["internet_eur_per_month"] * 12)
    add("Vacancy reserve",                gross_revenue * a["vacancy_reserve_pct"])
    add("Maintenance reserve",            gross_revenue * a["maintenance_reserve_pct"])
    add("Insurance",                      asking * a["insurance_pct"])
    add("Furnishing amortization",        a["furnishing_amort_eur"])
    add("Municipality tax",               asking * a["municipality_tax_pct"])
    add("Common expenses / HOA",          a["common_expenses_eur_per_month"] * 12)

    pre_tax = gross_revenue - sum(e["amount_eur"] for e in expenses)
    income_tax = max(0, int(pre_tax * a["income_tax_pct"]))
    add("Income tax",                     income_tax)

    # Financing line — only deducted if user assumed leverage.
    loan_amount = asking * a["ltv_pct"]
    annual_interest = int(loan_amount * a["financing_pct"])
    add("Financing costs (interest)",     annual_interest, f"{int(a['ltv_pct']*100)}% LTV @ {round(a['financing_pct']*100,2)}%")

    total_expenses = sum(e["amount_eur"] for e in expenses)
    net_cashflow   = gross_revenue - total_expenses
    equity         = max(1, asking - int(loan_amount))
    net_yield_pct  = round(((net_cashflow + annual_interest) / asking) * 100, 1) if asking else 0
    coc_pct        = round((net_cashflow / equity) * 100, 1) if equity else 0

    # Snapshot scores ─────────────────────────────────────────────────────
    str_score = _invest_clamp(int(48 + (base_occ - 60) * 1.4 + (base_adr - market["median_adr"]) * 0.10 + state_factor * 6), 28, 96)
    appreciation = _invest_clamp(int(market["appreciation_score"] + (h % 14) - 6), 28, 96)
    occupancy_strength = _invest_clamp(int(base_occ + (market["seasonality_buffer"] * 0.6)), 35, 96)
    pricing_power = _invest_clamp(int((base_adr / max(80, market["median_adr"])) * 60 + 20), 28, 96)
    design_upside = _invest_clamp(int(72 + ({"pristine": -8, "refresh": 0, "renovation": 12, "gut": 22}.get(state, 0)) + (h % 10) - 4), 28, 98)
    liquidity = _invest_clamp(int(market["liquidity_score"] + (h % 8) - 3), 28, 96)
    seasonality_risk = _invest_clamp(int(market["seasonality_risk"] + (h % 10) - 4), 8, 86)
    estimated_net_yield = net_yield_pct
    cash_on_cash = coc_pct

    snapshot = {
        "str_score": str_score,
        "appreciation_potential": appreciation,
        "occupancy_strength": occupancy_strength,
        "pricing_power": pricing_power,
        "design_upside": design_upside,
        "liquidity_score": liquidity,
        "seasonality_risk": seasonality_risk,
        "estimated_net_yield_pct": estimated_net_yield,
        "cash_on_cash_pct": cash_on_cash,
    }

    # Offer Intelligence ──────────────────────────────────────────────────
    # Compute four offer prices that yield specific cash-on-cash brackets.
    def _yields_at_price(p: int):
        eq = max(1, p - int(p * a["ltv_pct"]))
        interest = int(p * a["ltv_pct"] * a["financing_pct"])
        # rebuild expenses dependent on price
        delta = (interest - annual_interest) + (p - asking) * (a["insurance_pct"] + a["municipality_tax_pct"])
        net = net_cashflow - delta
        return (
            round(((net + interest) / p) * 100, 1) if p else 0,
            round((net / eq) * 100, 1) if eq else 0,
        )

    aggressive = int(asking * 0.86)
    smart      = int(asking * 0.92)
    fair       = int(asking)
    overpriced = int(asking * 1.10)

    offer_strategies = []
    for label, price in (
        ("Aggressive Buy", aggressive),
        ("Smart Buy", smart),
        ("Market Fair", fair),
        ("Overpriced", overpriced),
    ):
        ny, coc = _yields_at_price(price)
        offer_strategies.append({
            "label": label,
            "price_eur": price,
            "net_yield_pct": ny,
            "cash_on_cash_pct": coc,
        })

    ai_insights = []
    list_premium = round(((asking - smart) / smart) * 100, 1)
    if list_premium > 5:
        ai_insights.append(f"Property currently priced {list_premium}% above optimized STR acquisition value.")
    else:
        ai_insights.append("Asking price aligns with optimized STR acquisition envelope — entry-quality pricing.")
    smart_ny = offer_strategies[1]["net_yield_pct"]
    if smart_ny >= market["median_yield"]:
        ai_insights.append(f"At €{smart:,}, asset enters top quartile yield performance for this micro-market.")
    if state in ("renovation", "gut"):
        ai_insights.append("Transformation upside materially increases ADR potential — design uplift is the asymmetric edge.")
    elif design_upside >= 75:
        ai_insights.append("Propul8 optimization unlocks meaningful ADR uplift even without structural renovation.")
    ai_insights.append(f"Net yield separates by {round(offer_strategies[0]['net_yield_pct'] - offer_strategies[3]['net_yield_pct'], 1)} pts across the offer spectrum — negotiation leverage is material.")

    # True ROI snapshot ──────────────────────────────────────────────────
    true_roi = {
        "gross_revenue_eur":      gross_revenue,
        "total_expenses_eur":     total_expenses,
        "net_cashflow_eur":       net_cashflow,
        "expenses":               expenses,
        "occupancy_pct":          base_occ,
        "adr_eur":                base_adr,
        "nights":                 nights,
        "loan_amount_eur":        int(loan_amount),
        "annual_interest_eur":    annual_interest,
        "equity_required_eur":    equity,
        "assumptions_used":       {k: round(v, 4) for k, v in a.items()},
    }

    # Transformation Upside ──────────────────────────────────────────────
    cur_adr  = base_adr
    cur_occ  = base_occ
    opt_adr  = int(round(cur_adr * 1.30))
    opt_occ  = _invest_clamp(cur_occ + 11, 60, 92)
    prem_adr = int(round(cur_adr * 1.59))
    prem_occ = _invest_clamp(cur_occ + 16, 65, 94)

    def _scenario_yield(adr, occ):
        rev = adr * int(365 * occ / 100.0)
        # Hold expenses ratio constant: total_expenses = ~ratio_of_gross * rev
        expense_ratio = total_expenses / max(1, gross_revenue)
        new_total = rev * expense_ratio
        net = rev - new_total
        return round(((net + annual_interest) / asking) * 100, 1) if asking else 0

    transformation = {
        "scenarios": [
            {"label": "Current State",                  "adr": cur_adr,  "occupancy_pct": cur_occ,  "net_yield_pct": _scenario_yield(cur_adr, cur_occ)},
            {"label": "Optimized Interiors",            "adr": opt_adr,  "occupancy_pct": opt_occ,  "net_yield_pct": _scenario_yield(opt_adr, opt_occ)},
            {"label": "Premium Propul8 Positioning",       "adr": prem_adr, "occupancy_pct": prem_occ, "net_yield_pct": _scenario_yield(prem_adr, prem_occ)},
        ],
    }

    # Negotiation Insights ──────────────────────────────────────────────
    leverage = []
    reno_burden = {"pristine": (4, 8), "refresh": (8, 14), "renovation": (18, 26), "gut": (38, 55)}.get(state, (8, 14))
    leverage.append({
        "label": f"Estimated renovation burden: €{reno_burden[0]}k–€{reno_burden[1]}k",
        "detail": "Transparent reno scope is the strongest negotiation lever in design-led STR.",
        "severity": "high" if reno_burden[0] >= 18 else "medium",
    })
    if base_adr < market["median_adr"] - 10:
        leverage.append({
            "label": "Current interiors underperform district ADR benchmarks.",
            "detail": f"Asset prices ~€{int(market['median_adr']) - base_adr}/night below median for this micro-market.",
            "severity": "high",
        })
    if not (req.elevator if req.elevator is not None else True):
        leverage.append({
            "label": "Floor disadvantage — no elevator access.",
            "detail": "Reduces premium-guest conversion and pricing power; documented ADR drag of 6–9%.",
            "severity": "medium",
        })
    if (req.year_built or 1990) < 1980:
        leverage.append({
            "label": "Pre-1980 build — bathroom + kitchen renovation likely required.",
            "detail": "Bring inspector quotes — €6k–€14k per bathroom is typical leverage room.",
            "severity": "medium",
        })
    leverage.append({
        "label": "Furniture package below premium STR expectations.",
        "detail": "Editorial FF&E unlocks 18–25% ADR premium — owner rarely prices this in.",
        "severity": "low",
    })
    if seasonality_risk >= 60:
        leverage.append({
            "label": "Seasonality risk above district average.",
            "detail": "Use shoulder-season comp data to negotiate downward on the asking price.",
            "severity": "medium",
        })
    leverage = leverage[:6]

    # Market Signals ────────────────────────────────────────────────────
    signals = []

    def _sig(label, level):
        signals.append({"label": label, "level": level})

    _sig("Underpriced vs district",      "MODERATE" if list_premium > 0 else "HIGH")
    _sig("Tourism demand momentum",      market["demand_level"])
    _sig("Rising ADR market",            "HIGH" if appreciation >= 70 else "MODERATE")
    _sig("Occupancy district strength",  "HIGH" if occupancy_strength >= 75 else "MODERATE")
    _sig("Supply saturation risk",       market["supply_risk"])
    _sig("Appreciation momentum",        "HIGH" if appreciation >= 75 else "MODERATE")
    _sig("Luxury demand growth",         market["luxury_growth"])

    # STR Comps ──────────────────────────────────────────────────────────
    comps = []
    for i in range(5):
        seed = (h + i * 9173) & 0xFFFFFFFF
        adr_i = int(market["median_adr"] * (0.92 + ((seed % 1000) / 1000.0) * 0.36))
        occ_i = _invest_clamp(int(market["median_occupancy"] - 4 + (seed % 18)), 55, 92)
        nights_i = int(365 * occ_i / 100.0)
        rev_i = adr_i * nights_i
        comps.append({
            "name":         _invest_comp_name(req.city, i),
            "occupancy_pct": occ_i,
            "adr_eur":      adr_i,
            "monthly_rev_eur": int(rev_i / 12),
            "design_quality": ["Editorial", "Premium", "Mid-market", "Mid-market", "Editorial"][i],
            "distance_km":  round(0.3 + (seed % 28) / 10.0, 1),
            "positioning":  ["Boutique", "Family", "Couples", "Mid-market", "Editorial"][i],
        })
    comps_post_vela = {
        "projected_adr_eur": prem_adr,
        "projected_occupancy_pct": prem_occ,
        "projected_monthly_rev_eur": int(prem_adr * int(365 * prem_occ / 100.0) / 12),
        "projected_positioning": "Top-decile editorial",
    }

    # Max Buy Price Tool ────────────────────────────────────────────────
    def _max_price_for_yield(target_pct):
        # Hold expenses ratio constant. price * target = (gross - expense_ratio*gross + interest_at_price)
        expense_ratio = total_expenses / max(1, gross_revenue)
        net_at_x = gross_revenue * (1 - expense_ratio)
        # net + interest = price * target. interest = price * ltv * apr
        # net + price*ltv*apr = price*target => price = net / (target - ltv*apr)
        denom = (target_pct / 100.0) - (a["ltv_pct"] * a["financing_pct"])
        if denom <= 0:
            return None
        return int(round((net_at_x + annual_interest) / denom))

    max_buy = []
    for tgt in (15, 12, 10, 8):
        p = _max_price_for_yield(tgt)
        if p:
            max_buy.append({"target_yield_pct": tgt, "max_price_eur": p})

    return {
        "asset_id": str(asset_id)[:80],
        "input": {
            "url":              req.url,
            "title":            req.title,
            "city":             req.city,
            "property_type":    req.property_type,
            "asking_price_eur": asking,
            "m2":               m2,
            "rooms":            rooms,
            "sleeps":           sleeps,
            "renovation_state": state,
            "year_built":       req.year_built,
            "elevator":         req.elevator,
            "floor":            req.floor,
            "images":           (req.images or [])[:8],
        },
        "snapshot":          snapshot,
        "offer_intelligence": {"strategies": offer_strategies, "ai_insights": ai_insights},
        "true_roi":          true_roi,
        "transformation":    transformation,
        "negotiation":       leverage,
        "market_signals":    signals,
        "str_comps":         {"comps": comps, "post_vela": comps_post_vela, "market_label": market["label"]},
        "max_buy_price":     max_buy,
        "analysis_version":  "invest-v1.0",
        "generated_at":      datetime.now(timezone.utc).isoformat(),
    }


def _invest_market_profile(city: str, ptype: str) -> Dict[str, Any]:
    c = (city or "").lower()
    profiles = {
        "athens":     {"label": "Athens · design-led urban STR", "median_adr": 130, "median_occupancy": 72, "median_yield": 8.6, "appreciation_score": 72, "seasonality_risk": 26, "seasonality_buffer": 4, "liquidity_score": 78, "demand_level": "HIGH", "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
        "mykonos":    {"label": "Mykonos · ultra-premium STR",   "median_adr": 380, "median_occupancy": 64, "median_yield": 9.4, "appreciation_score": 80, "seasonality_risk": 72, "seasonality_buffer": -8, "liquidity_score": 84, "demand_level": "HIGH", "supply_risk": "HIGH",     "luxury_growth": "HIGH"},
        "paros":      {"label": "Paros · editorial Cycladic STR", "median_adr": 220, "median_occupancy": 66, "median_yield": 9.0, "appreciation_score": 78, "seasonality_risk": 64, "seasonality_buffer": -4, "liquidity_score": 70, "demand_level": "HIGH", "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
        "naxos":      {"label": "Naxos · boutique island STR",   "median_adr": 175, "median_occupancy": 67, "median_yield": 8.8, "appreciation_score": 74, "seasonality_risk": 58, "seasonality_buffer": -2, "liquidity_score": 64, "demand_level": "MODERATE", "supply_risk": "LOW", "luxury_growth": "MODERATE"},
        "santorini":  {"label": "Santorini · iconic STR",         "median_adr": 360, "median_occupancy": 70, "median_yield": 9.2, "appreciation_score": 77, "seasonality_risk": 70, "seasonality_buffer": -6, "liquidity_score": 86, "demand_level": "HIGH", "supply_risk": "HIGH",     "luxury_growth": "HIGH"},
        "koufonisia": {"label": "Koufonisia · low-volume editorial", "median_adr": 200, "median_occupancy": 62, "median_yield": 8.4, "appreciation_score": 80, "seasonality_risk": 78, "seasonality_buffer": -10, "liquidity_score": 56, "demand_level": "MODERATE", "supply_risk": "LOW", "luxury_growth": "HIGH"},
        "thessaloniki": {"label": "Thessaloniki · urban yield",  "median_adr": 95,  "median_occupancy": 71, "median_yield": 8.0, "appreciation_score": 64, "seasonality_risk": 24, "seasonality_buffer": 6, "liquidity_score": 72, "demand_level": "MODERATE", "supply_risk": "MODERATE", "luxury_growth": "MODERATE"},
        "riga":       {"label": "Riga · Baltic urban STR",        "median_adr": 75,  "median_occupancy": 64, "median_yield": 9.6, "appreciation_score": 60, "seasonality_risk": 38, "seasonality_buffer": 0, "liquidity_score": 58, "demand_level": "MODERATE", "supply_risk": "LOW",      "luxury_growth": "MODERATE"},
        "dubai":      {"label": "Dubai · luxury STR market",      "median_adr": 290, "median_occupancy": 70, "median_yield": 7.4, "appreciation_score": 80, "seasonality_risk": 32, "seasonality_buffer": 2, "liquidity_score": 88, "demand_level": "HIGH",     "supply_risk": "HIGH",      "luxury_growth": "HIGH"},
        "lisbon":     {"label": "Lisbon · design-led urban STR",   "median_adr": 145, "median_occupancy": 73, "median_yield": 7.8, "appreciation_score": 75, "seasonality_risk": 28, "seasonality_buffer": 4, "liquidity_score": 78, "demand_level": "HIGH",     "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
        "comporta":   {"label": "Comporta · editorial coastal STR", "median_adr": 320, "median_occupancy": 65, "median_yield": 8.2, "appreciation_score": 82, "seasonality_risk": 58, "seasonality_buffer": -4, "liquidity_score": 64, "demand_level": "MODERATE", "supply_risk": "LOW", "luxury_growth": "HIGH"},
    }
    for key, prof in profiles.items():
        if key in c:
            return prof
    return {"label": "Mediterranean default STR", "median_adr": 150, "median_occupancy": 68, "median_yield": 8.4, "appreciation_score": 68, "seasonality_risk": 42, "seasonality_buffer": 0, "liquidity_score": 68, "demand_level": "MODERATE", "supply_risk": "MODERATE", "luxury_growth": "MODERATE"}


def _invest_comp_name(city: str, i: int) -> str:
    base = (city or "Mediterranean").split(",")[0]
    suffixes = ["Loft", "Suite", "Maison", "Boutique", "Residence"]
    return f"{base} {suffixes[i % len(suffixes)]} {chr(65 + (i % 6))}"


@router.post("/invest/analyze")
async def invest_analyze(req: InvestAnalyzeRequest):
    if not req.city or not req.property_type or not req.asking_price_eur:
        raise HTTPException(400, "city, property_type, asking_price_eur required")
    return _compute_invest_intelligence(req)


# ---------------------------------------------------------------------------
# Propul8 INVEST — Server-side draft persistence
# ---------------------------------------------------------------------------
# Drafts are stored with a TTL index so they auto-expire after 24h. The route
# `/invest/asset/:draft_id` becomes reload-safe — frontend hydrates from
# /api/invest/draft/:id instead of sessionStorage.

class InvestDraftCreate(BaseModel):
    url:              Optional[str] = None
    title:            Optional[str] = None
    city:             Optional[str] = None
    property_type:    Optional[str] = None
    asking_price_eur: Optional[int] = None
    m2:               Optional[int] = None
    rooms:            Optional[int] = None
    bathrooms:        Optional[int] = None
    floor:            Optional[str] = None
    elevator:         Optional[bool] = None
    parking:          Optional[bool] = None
    energy_class:     Optional[str] = None
    year_built:       Optional[int] = None
    renovation_state: Optional[str] = None
    listing_source:   Optional[str] = None
    images:           Optional[List[str]] = None
    raw_excerpt:      Optional[str] = None
    provenance:       Optional[Dict[str, str]] = None


def _short_id(prefix: str, length: int = 10) -> str:
    return prefix + uuid.uuid4().hex[:length]


@router.post("/invest/draft")
async def invest_create_draft(payload: InvestDraftCreate):
    draft_id = _short_id("dft_", 12)
    doc = payload.dict()
    doc["_id"]        = draft_id
    doc["draft_id"]   = draft_id
    doc["created_at"] = datetime.now(timezone.utc)
    # Persist provenance/confidence map under a stable key for the verify UI.
    if doc.get("provenance"):
        doc["_confidence"] = doc.pop("provenance")
    await _db["invest_drafts"].insert_one(doc)
    doc.pop("_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@router.get("/invest/draft/{draft_id}")
async def invest_get_draft(draft_id: str):
    doc = await _db["invest_drafts"].find_one({"draft_id": draft_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "draft not found or expired")
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

