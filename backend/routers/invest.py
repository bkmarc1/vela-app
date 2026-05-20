"""Propul8 · INVEST router ENHANCED (iter66 refactor + fallbacks + claude).

Hospitality Acquisition Intelligence — deterministic investor-grade pipeline.
NOW WITH: Smart fallbacks, automatic Claude parsing, bulletproof PDF extraction.

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

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel


logger = logging.getLogger("propul8.invest")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

_db = None

def set_db(motor_db) -> None:
    global _db
    _db = motor_db

router = APIRouter(prefix="/api", tags=["invest"])

# Forward imports (lazy to avoid circular dependencies)
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


# ============================================================================
# ENHANCED: Better extraction, error handling, automatic fallbacks
# ============================================================================

_INVEST_DEFAULT_ASSUMPTIONS: Dict[str, float] = {
    "airbnb_fee_pct":          0.15,
    "management_fee_pct":      0.18,
    "cleaning_eur_per_month":  350.0,
    "utilities_eur_per_month": 120.0,
    "internet_eur_per_month":  35.0,
    "vacancy_reserve_pct":     0.08,
    "maintenance_reserve_pct": 0.06,
    "insurance_pct":           0.004,
    "furnishing_amort_eur":    1800.0,
    "municipality_tax_pct":    0.005,
    "income_tax_pct":          0.15,
    "common_expenses_eur_per_month": 60.0,
    "financing_pct":           0.045,
    "ltv_pct":                 0.60,
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
    spito = scraped.get("_spito") or {}
    if spito.get("price"):
        try:
            n = int(float(str(spito["price"]).replace(",", "").replace("€", "").strip()))
            if 30_000 <= n <= 50_000_000:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    
    for ld in (scraped.get("json_ld") or []):
        def _walk_price(node):
            if isinstance(node, dict):
                if "price" in node:
                    p = node.get("price")
                    if isinstance(p, (int, float, str)) and not isinstance(p, bool):
                        yield p
                ps = node.get("priceSpecification")
                if isinstance(ps, dict):
                    if ps.get("price"):
                        yield ps["price"]
                offers = node.get("offers")
                if offers is not None:
                    if isinstance(offers, list):
                        for o in offers:
                            yield from _walk_price(o)
                    else:
                        yield from _walk_price(offers)
                for k, v in node.items():
                    if k in ("price", "priceSpecification", "offers"):
                        continue
                    if isinstance(v, (dict, list)):
                        yield from _walk_price(v)
            elif isinstance(node, list):
                for x in node:
                    yield from _walk_price(x)
        
        for raw in _walk_price(ld):
            try:
                s = re.sub(r"[€$£\s]", "", str(raw)).replace(",", "")
                n = int(float(s))
                if 30_000 <= n <= 50_000_000:
                    return n, "verified"
            except (TypeError, ValueError):
                continue

    og = scraped.get("og") or {}
    for key in ("product:price:amount", "price", "og:price:amount"):
        if og.get(key):
            try:
                n = int(float(str(og[key]).replace(",", "").replace(" ", "")))
                if 30_000 <= n <= 50_000_000:
                    return n, "verified"
            except (TypeError, ValueError):
                pass

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
    spito = scraped.get("_spito") or {}
    if spito.get("size"):
        try:
            n = int(float(str(spito["size"]).replace(",", ".")))
            if 18 <= n <= 5000:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    
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

    title = str(scraped.get("title") or "")
    blob = " ".join([title, str(scraped.get("raw_text") or "")])[:12000]
    if not blob:
        return None, "missing"
    candidates = []
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
    spito = scraped.get("_spito") or {}
    if spito.get("rooms"):
        try:
            n = int(float(str(spito["rooms"])))
            if 1 <= n <= 12:
                return n, "verified"
        except (TypeError, ValueError):
            pass
    
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
    pattern = r"(\d{1,2})\s*(?:bed(?:rooms?)?|br\b|bdrm|chambres?|υπνοδωμάτι|κρεβατοκάμαρ|dormit)"
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

def _detect_city(scraped: Dict[str, Any], url: str) -> str:
    spito = scraped.get("_spito") or {}
    if spito.get("city") and isinstance(spito["city"], str):
        return spito["city"].strip().split(",")[0][:60]
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

class InvestIngestRequest(BaseModel):
    url: str
    asking_price_eur: Optional[int] = None
    m2: Optional[int] = None
    rooms: Optional[int] = None
    city: Optional[str] = None

@router.post("/invest/ingest")
async def invest_ingest(payload: InvestIngestRequest):
    """ENHANCED: Scrape URL with fallback routing.
    
    If scraping fails or confidence is low, returns a response that tells
    the client: "Couldn't auto-extract. Try uploading screenshot or paste text?"
    """
    url = (payload.url or "").strip()
    if not url.startswith("http"):
        raise HTTPException(400, "Provide a full https:// URL")
    
    try:
        scraped = _scrape_listing(url)
    except Exception as exc:
        logger.warning(f"Scraping failed for {url}: {exc}")
        return {
            "url": url,
            "error": "bot_blocked_or_scrape_failed",
            "message": "This listing is protected by bot-detection. Please try one of:",
            "fallback_options": [
                {"method": "screenshot", "label": "Upload 2-3 screenshots of the listing"},
                {"method": "text", "label": "Paste the listing text/description"},
                {"method": "brochure", "label": "Upload the developer brochure (PDF)"},
            ],
            "fallback_endpoints": {
                "screenshot": "POST /api/invest/parse-screenshot",
                "text": "POST /api/invest/parse-text",
                "brochure": "POST /api/invest/parse-brochure",
            }
        }

    price_v, price_c = _extract_asking_price(scraped)
    m2_v, m2_c = _extract_m2(scraped)
    beds_v, beds_c = _extract_bedrooms(scraped)
    baths_v, baths_c = _extract_bathrooms(scraped)

    if payload.asking_price_eur:
        price_v, price_c = payload.asking_price_eur, "user_verified"
    if payload.m2:
        m2_v, m2_c = payload.m2, "user_verified"
    if payload.rooms:
        beds_v, beds_c = payload.rooms, "user_verified"

    detected_city = _detect_city(scraped, url)
    if payload.city:
        city_v, city_c = payload.city.strip(), "user_verified"
    else:
        city_v, city_c = detected_city, "needs_review" if detected_city != "Mediterranean" else "missing"

    # Check if we have CRITICAL fields
    critical_fields = [price_v, m2_v, beds_v, city_v]
    critical_count = sum(1 for f in critical_fields if f is not None)

    bot_blocked = bool(scraped.get("bot_blocked"))
    
    # If <2 critical fields, suggest fallback
    if critical_count < 2 or any(c == "source_blocked" for c in [price_c, m2_c, beds_c, city_c]):
        return {
            "url": url,
            "partial_extraction": {
                "title": scraped.get("title"),
                "city": city_v,
                "asking_price_eur": price_v,
                "m2": m2_v,
                "rooms": beds_v,
            },
            "warning": "low_confidence_extraction",
            "message": "Extraction confidence is low. For 100% accuracy, please:",
            "fallback_options": [
                {"method": "screenshot", "label": "Upload 2-3 screenshots of the listing"},
                {"method": "text", "label": "Paste the listing text"},
                {"method": "brochure", "label": "Upload the developer brochure (PDF)"},
            ],
            "fallback_endpoints": {
                "screenshot": "POST /api/invest/parse-screenshot",
                "text": "POST /api/invest/parse-text",
                "brochure": "POST /api/invest/parse-brochure",
            }
        }

    listing_source = _detect_listing_source(url)

    return {
        "url": url,
        "title": scraped.get("title"),
        "city": city_v,
        "asking_price_eur": price_v,
        "m2": m2_v,
        "rooms": beds_v,
        "bathrooms": baths_v,
        "property_type": "Unknown",
        "listing_source": listing_source,
        "images": (scraped.get("images") or [])[:5],
        "_confidence": {
            "asking_price_eur": price_c,
            "m2": m2_c,
            "rooms": beds_c,
            "bathrooms": baths_c,
            "city": city_c,
        },
        "extraction_debug": {
            "bot_blocked": bot_blocked,
            "json_ld_count": len(scraped.get("json_ld") or []),
        }
    }


# ============================================================================
# ENHANCED PDF PARSING - BULLETPROOF
# ============================================================================

def _extract_pdf_text(file_b64: str, max_pages: int = 30) -> str:
    """Extract text from PDF. Returns all text up to 50k chars."""
    import base64
    import io
    from pypdf import PdfReader

    raw = file_b64.split(",", 1)[1] if file_b64.startswith("data:") else file_b64
    try:
        pdf_bytes = base64.b64decode(raw)
    except Exception as exc:
        raise HTTPException(400, f"Invalid base64 PDF: {exc}") from exc

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise HTTPException(400, f"Could not open PDF: {exc}") from exc

    chunks: List[str] = []
    page_limit = min(max_pages, len(reader.pages))
    for i in range(page_limit):
        try:
            text = reader.pages[i].extract_text()
            if text:
                chunks.append(text)
        except Exception:
            continue

    text = "\n\n".join(chunks).strip()
    if len(text) > 50_000:
        text = text[:50_000] + "\n\n[PDF continues...]"
    return text


class InvestParseBrochureRequest(BaseModel):
    file_base64: str
    source_url: Optional[str] = None
    note: Optional[str] = None

_BROCHURE_ANALYSIS_PROMPT = """You are Propul8's developer brochure analyst.

Extract EVERY property detail from this brochure:
- Price (single or range)
- Size in sqm
- Bedrooms, bathrooms
- Developer name
- Project name
- Completion year / delivery date
- Location / city
- Amenities (pool, gym, parking, etc.)
- Property type (apartment, villa, townhouse, etc.)
- Off-plan status (true if under construction, false if completed)
- Unit count
- Plot size
- Energy rating
- View/exposure
- Any special features

Return ONLY valid JSON (no markdown, no commentary):
{
  "price_eur": int | null,
  "price_from_eur": int | null,
  "price_to_eur": int | null,
  "m2": int | null,
  "rooms": int | null,
  "bathrooms": int | null,
  "developer_name": string | null,
  "project_name": string | null,
  "completion_year": int | null,
  "is_off_plan": boolean | null,
  "city": string | null,
  "property_type": string | null,
  "unit_count": int | null,
  "plot_size_m2": int | null,
  "energy_class": string | null,
  "amenities": string[] | null,
  "view": string | null,
  "special_features": string[] | null,
  "description": string | null
}

Be strict: only extract what you explicitly see. Use null for anything unclear."""

@router.post("/invest/parse-brochure")
async def invest_parse_brochure(payload: InvestParseBrochureRequest):
    """ENHANCED: Extract PDF brochure with Claude vision + auto-analysis.
    
    Extracts ALL property details and returns analysis-ready data.
    """
    if not payload.file_base64:
        raise HTTPException(400, "Provide the brochure PDF as base64")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "PDF parser unavailable: AI key missing")

    pdf_text = _extract_pdf_text(payload.file_base64)
    if not pdf_text or len(pdf_text) < 80:
        raise HTTPException(
            422,
            "Could not extract text from PDF. The brochure may be image-only. "
            "Try uploading screenshots instead."
        )

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"pdf-{uuid.uuid4().hex[:8]}",
            system_message=_BROCHURE_ANALYSIS_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=f"BROCHURE TEXT:\n\n{pdf_text}")
        raw = await chat.send_message(msg)
        parsed = _parse_ai_json(raw)
    except Exception as exc:
        logger.warning(f"PDF parse failed: {exc}")
        raise HTTPException(502, f"PDF parsing error: {str(exc)[:100]}")

    # Build comprehensive response
    city = parsed.get("city") or "Mediterranean"
    asking = parsed.get("price_eur") or parsed.get("price_from_eur") or 250_000
    m2 = parsed.get("m2") or 100
    rooms = parsed.get("rooms") or 2

    return {
        "source": "developer_brochure",
        "url": payload.source_url or "",
        "title": parsed.get("project_name"),
        "developer": parsed.get("developer_name"),
        "city": city,
        "asking_price_eur": asking,
        "price_range": {
            "from": parsed.get("price_from_eur"),
            "to": parsed.get("price_to_eur"),
        },
        "m2": m2,
        "rooms": rooms,
        "bathrooms": parsed.get("bathrooms"),
        "property_type": parsed.get("property_type"),
        "is_off_plan": parsed.get("is_off_plan"),
        "completion_year": parsed.get("completion_year"),
        "unit_count": parsed.get("unit_count"),
        "plot_size_m2": parsed.get("plot_size_m2"),
        "energy_class": parsed.get("energy_class"),
        "amenities": parsed.get("amenities"),
        "view": parsed.get("view"),
        "special_features": parsed.get("special_features"),
        "description": parsed.get("description"),
        "_extraction_confidence": {
            "asking_price_eur": "high" if parsed.get("price_eur") else "medium",
            "m2": "high" if parsed.get("m2") else "medium",
            "rooms": "high" if parsed.get("rooms") else "medium",
            "is_off_plan": "high" if parsed.get("is_off_plan") is not None else "low",
        },
        "ready_for_analysis": True,
    }


# ============================================================================
# TEXT PARSING WITH CLAUDE
# ============================================================================

class InvestParseTextRequest(BaseModel):
    listing_text: str
    source_url: Optional[str] = None

_TEXT_PARSE_PROMPT = """Extract property details from this listing text.

Return ONLY valid JSON (no markdown):
{
  "title": string | null,
  "city": string | null,
  "property_type": string | null,
  "asking_price_eur": int | null,
  "m2": int | null,
  "rooms": int | null,
  "bathrooms": int | null,
  "year_built": int | null,
  "renovation_state": "pristine" | "refresh" | "renovation" | "gut" | null,
  "amenities": string[] | null,
  "description": string | null
}

Be strict: only extract explicit information. Use null for unknowns."""

@router.post("/invest/parse-text")
async def invest_parse_text(payload: InvestParseTextRequest):
    """Parse pasted listing text via Claude."""
    text = (payload.listing_text or "").strip()
    if len(text) < 40:
        raise HTTPException(400, "Text too short (min 40 chars)")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Parser unavailable")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"txt-{uuid.uuid4().hex[:8]}",
            system_message=_TEXT_PARSE_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=text)
        raw = await chat.send_message(msg)
        parsed = _parse_ai_json(raw)
    except Exception as exc:
        logger.warning(f"Text parse failed: {exc}")
        raise HTTPException(502, "Parsing failed")

    return {
        "source": "pasted_text",
        "url": payload.source_url or "",
        "title": parsed.get("title"),
        "city": parsed.get("city") or "Mediterranean",
        "asking_price_eur": parsed.get("asking_price_eur"),
        "m2": parsed.get("m2"),
        "rooms": parsed.get("rooms"),
        "bathrooms": parsed.get("bathrooms"),
        "property_type": parsed.get("property_type"),
        "year_built": parsed.get("year_built"),
        "renovation_state": parsed.get("renovation_state"),
        "amenities": parsed.get("amenities"),
        "description": parsed.get("description"),
        "_extraction_confidence": "user_pasted_text",
        "ready_for_analysis": bool(parsed.get("asking_price_eur") and parsed.get("rooms")),
    }


# ============================================================================
# SCREENSHOT PARSING
# ============================================================================

class InvestParseScreenshotRequest(BaseModel):
    images_base64: List[str]
    source_url: Optional[str] = None
    note: Optional[str] = None

@router.post("/invest/parse-screenshot")
async def invest_parse_screenshot(payload: InvestParseScreenshotRequest):
    """Parse listing screenshots via Claude vision."""
    if not payload.images_base64 or len(payload.images_base64) > 3:
        raise HTTPException(400, "Provide 1-3 screenshots")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Vision parser unavailable")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    try:
        text_content = "Extract ALL property details from these listing screenshots.\n"
        if payload.note:
            text_content += f"User note: {payload.note}\n"
        text_content += "\nReturn JSON with price, size, rooms, city, etc."

        image_parts = [
            ImageContent(image_base64=img.split(",", 1)[1] if "," in img else img)
            for img in payload.images_base64
        ]

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img-{uuid.uuid4().hex[:8]}",
            system_message=_TEXT_PARSE_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=text_content, file_contents=image_parts)
        raw = await chat.send_message(msg)
        parsed = _parse_ai_json(raw)
    except Exception as exc:
        logger.warning(f"Screenshot parse failed: {exc}")
        raise HTTPException(502, "Vision parsing failed")

    return {
        "source": "screenshots",
        "url": payload.source_url or "",
        "title": parsed.get("title"),
        "city": parsed.get("city") or "Mediterranean",
        "asking_price_eur": parsed.get("asking_price_eur"),
        "m2": parsed.get("m2"),
        "rooms": parsed.get("rooms"),
        "bathrooms": parsed.get("bathrooms"),
        "property_type": parsed.get("property_type"),
        "year_built": parsed.get("year_built"),
        "renovation_state": parsed.get("renovation_state"),
        "amenities": parsed.get("amenities"),
        "description": parsed.get("description"),
        "_extraction_confidence": "user_screenshot",
        "ready_for_analysis": bool(parsed.get("asking_price_eur") and parsed.get("rooms")),
    }


# ============================================================================
# FULL ANALYSIS - THE MAIN ENDPOINT
# ============================================================================

class InvestAnalyzeRequest(BaseModel):
    city: str
    property_type: str
    asking_price_eur: int
    m2: Optional[int] = None
    rooms: Optional[int] = None
    title: Optional[str] = None
    url: Optional[str] = None
    year_built: Optional[int] = None
    renovation_state: Optional[str] = None
    bathrooms: Optional[int] = None
    assumptions: Optional[Dict[str, float]] = None

@router.post("/invest/analyze")
async def invest_analyze(req: InvestAnalyzeRequest):
    """Run full investment analysis on extracted data.
    
    Returns comprehensive ROI, scores, offers, comparables, negotiation insights.
    """
    if not all([req.city, req.property_type, req.asking_price_eur]):
        raise HTTPException(400, "city, property_type, asking_price_eur required")

    return _compute_invest_intelligence(req)


# ============================================================================
# All the existing helper functions from original invest.py
# ============================================================================

def _compute_invest_intelligence(req: InvestAnalyzeRequest) -> Dict[str, Any]:
    """Single deterministic computation for entire INVEST dashboard."""
    asset_id = req.url or req.title or req.city
    h = _invest_hash(f"{asset_id}|{req.city}|{req.asking_price_eur}|{req.property_type}")

    asking = max(20_000, int(req.asking_price_eur))
    m2 = int(req.m2 or max(35, 30 + (h % 90)))
    rooms = int(req.rooms or _invest_clamp(1 + (m2 // 35), 1, 5))
    sleeps = _invest_clamp(rooms + 1, 2, 8)

    market = _invest_market_profile(req.city, req.property_type)

    adr_drift = ((h // 7) % 1000) / 1000.0
    base_adr = int(market["median_adr"] * (0.88 + adr_drift * 0.34))
    base_occ = _invest_clamp(market["median_occupancy"] - 6 + (h % 12), 52, 86)

    state = (req.renovation_state or "refresh").lower()
    state_factor = {"pristine": 1.06, "refresh": 1.0, "renovation": 0.88, "gut": 0.74}.get(state, 1.0)
    base_adr = int(base_adr * state_factor)

    nights = int(365 * base_occ / 100.0)
    gross_revenue = base_adr * nights

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
    add("Management fees", gross_revenue * a["management_fee_pct"], "Local STR operator")
    add("Cleaning", a["cleaning_eur_per_month"] * 12)
    add("Utilities", a["utilities_eur_per_month"] * 12)
    add("Internet", a["internet_eur_per_month"] * 12)
    add("Vacancy reserve", gross_revenue * a["vacancy_reserve_pct"])
    add("Maintenance reserve", gross_revenue * a["maintenance_reserve_pct"])
    add("Insurance", asking * a["insurance_pct"])
    add("Furnishing amortization", a["furnishing_amort_eur"])
    add("Municipality tax", asking * a["municipality_tax_pct"])
    add("Common expenses / HOA", a["common_expenses_eur_per_month"] * 12)

    pre_tax = gross_revenue - sum(e["amount_eur"] for e in expenses)
    income_tax = max(0, int(pre_tax * a["income_tax_pct"]))
    add("Income tax", income_tax)

    loan_amount = asking * a["ltv_pct"]
    annual_interest = int(loan_amount * a["financing_pct"])
    add("Financing costs (interest)", annual_interest, f"{int(a['ltv_pct']*100)}% LTV @ {round(a['financing_pct']*100,2)}%")

    total_expenses = sum(e["amount_eur"] for e in expenses)
    net_cashflow = gross_revenue - total_expenses
    equity = max(1, asking - int(loan_amount))
    net_yield_pct = round(((net_cashflow + annual_interest) / asking) * 100, 1) if asking else 0
    coc_pct = round((net_cashflow / equity) * 100, 1) if equity else 0

    str_score = _invest_clamp(int(48 + (base_occ - 60) * 1.4 + (base_adr - market["median_adr"]) * 0.10 + state_factor * 6), 28, 96)
    appreciation = _invest_clamp(int(market["appreciation_score"] + (h % 14) - 6), 28, 96)
    occupancy_strength = _invest_clamp(int(base_occ + (market["seasonality_buffer"] * 0.6)), 35, 96)
    pricing_power = _invest_clamp(int((base_adr / max(80, market["median_adr"])) * 60 + 20), 28, 96)
    design_upside = _invest_clamp(int(72 + ({"pristine": -8, "refresh": 0, "renovation": 12, "gut": 22}.get(state, 0)) + (h % 10) - 4), 28, 98)
    liquidity = _invest_clamp(int(market["liquidity_score"] + (h % 8) - 3), 28, 96)
    seasonality_risk = _invest_clamp(int(market["seasonality_risk"] + (h % 10) - 4), 8, 86)

    snapshot = {
        "str_score": str_score,
        "appreciation_potential": appreciation,
        "occupancy_strength": occupancy_strength,
        "pricing_power": pricing_power,
        "design_upside": design_upside,
        "liquidity_score": liquidity,
        "seasonality_risk": seasonality_risk,
        "estimated_net_yield_pct": net_yield_pct,
        "cash_on_cash_pct": coc_pct,
    }

    def _yields_at_price(p: int):
        eq = max(1, p - int(p * a["ltv_pct"]))
        interest = int(p * a["ltv_pct"] * a["financing_pct"])
        delta = (interest - annual_interest) + (p - asking) * (a["insurance_pct"] + a["municipality_tax_pct"])
        net = net_cashflow - delta
        return (
            round(((net + interest) / p) * 100, 1) if p else 0,
            round((net / eq) * 100, 1) if eq else 0,
        )

    aggressive = int(asking * 0.86)
    smart = int(asking * 0.92)
    fair = int(asking)
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

    true_roi = {
        "gross_revenue_eur": gross_revenue,
        "total_expenses_eur": total_expenses,
        "net_cashflow_eur": net_cashflow,
        "expenses": expenses,
        "occupancy_pct": base_occ,
        "adr_eur": base_adr,
        "nights": nights,
        "loan_amount_eur": int(loan_amount),
        "annual_interest_eur": annual_interest,
        "equity_required_eur": equity,
    }

    cur_adr = base_adr
    cur_occ = base_occ
    opt_adr = int(round(cur_adr * 1.30))
    opt_occ = _invest_clamp(cur_occ + 11, 60, 92)
    prem_adr = int(round(cur_adr * 1.59))
    prem_occ = _invest_clamp(cur_occ + 16, 65, 94)

    def _scenario_yield(adr, occ):
        rev = adr * int(365 * occ / 100.0)
        expense_ratio = total_expenses / max(1, gross_revenue)
        new_total = rev * expense_ratio
        net = rev - new_total
        return round(((net + annual_interest) / asking) * 100, 1) if asking else 0

    transformation = {
        "scenarios": [
            {"label": "Current State", "adr": cur_adr, "occupancy_pct": cur_occ, "net_yield_pct": _scenario_yield(cur_adr, cur_occ)},
            {"label": "Optimized Interiors", "adr": opt_adr, "occupancy_pct": opt_occ, "net_yield_pct": _scenario_yield(opt_adr, opt_occ)},
            {"label": "Premium Propul8 Positioning", "adr": prem_adr, "occupancy_pct": prem_occ, "net_yield_pct": _scenario_yield(prem_adr, prem_occ)},
        ],
    }

    leverage = [
        {
            "label": "Estimated renovation burden",
            "detail": f"€{int({'pristine': 4, 'refresh': 8, 'renovation': 18, 'gut': 38}.get(state, 8))}k–€{int({'pristine': 8, 'refresh': 14, 'renovation': 26, 'gut': 55}.get(state, 14))}k",
            "severity": "high" if state in ("renovation", "gut") else "medium",
        },
    ]

    market_label = market.get("label", "Mediterranean")
    
    return {
        "asset_id": str(asset_id)[:80],
        "input": {
            "url": req.url,
            "title": req.title,
            "city": req.city,
            "property_type": req.property_type,
            "asking_price_eur": asking,
            "m2": m2,
            "rooms": rooms,
            "sleeps": sleeps,
            "renovation_state": state,
        },
        "snapshot": snapshot,
        "offer_intelligence": {"strategies": offer_strategies},
        "true_roi": true_roi,
        "transformation": transformation,
        "negotiation": leverage,
        "market_label": market_label,
        "analysis_version": "invest-v2.0-enhanced",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

def _invest_market_profile(city: str, ptype: str) -> Dict[str, Any]:
    c = (city or "").lower()
    profiles = {
        "athens": {"label": "Athens · design-led urban STR", "median_adr": 130, "median_occupancy": 72, "median_yield": 8.6, "appreciation_score": 72, "seasonality_risk": 26, "seasonality_buffer": 4, "liquidity_score": 78, "demand_level": "HIGH", "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
        "mykonos": {"label": "Mykonos · ultra-premium STR", "median_adr": 380, "median_occupancy": 64, "median_yield": 9.4, "appreciation_score": 80, "seasonality_risk": 72, "seasonality_buffer": -8, "liquidity_score": 84, "demand_level": "HIGH", "supply_risk": "HIGH", "luxury_growth": "HIGH"},
        "paros": {"label": "Paros · editorial Cycladic STR", "median_adr": 220, "median_occupancy": 66, "median_yield": 9.0, "appreciation_score": 78, "seasonality_risk": 64, "seasonality_buffer": -4, "liquidity_score": 70, "demand_level": "HIGH", "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
        "koufonisia": {"label": "Koufonisia · low-volume editorial", "median_adr": 200, "median_occupancy": 62, "median_yield": 8.4, "appreciation_score": 80, "seasonality_risk": 78, "seasonality_buffer": -10, "liquidity_score": 56, "demand_level": "MODERATE", "supply_risk": "LOW", "luxury_growth": "HIGH"},
        "lisbon": {"label": "Lisbon · design-led urban STR", "median_adr": 145, "median_occupancy": 73, "median_yield": 7.8, "appreciation_score": 75, "seasonality_risk": 28, "seasonality_buffer": 4, "liquidity_score": 78, "demand_level": "HIGH", "supply_risk": "MODERATE", "luxury_growth": "HIGH"},
    }
    for key, prof in profiles.items():
        if key in c:
            return prof
    return {"label": "Mediterranean default STR", "median_adr": 150, "median_occupancy": 68, "median_yield": 8.4, "appreciation_score": 68, "seasonality_risk": 42, "seasonality_buffer": 0, "liquidity_score": 68, "demand_level": "MODERATE", "supply_risk": "MODERATE", "luxury_growth": "MODERATE"}