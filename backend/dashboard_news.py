"""Propul8 · Dashboard News service.

Fetches the latest Athens / Greek real-estate headlines from a small list
of free RSS feeds, filters by relevance, and returns a clean digest. No
external API key required.

Cached in MongoDB collection `news_cache` for 30 minutes so the dashboard
loads instantly on repeat visits.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET

import httpx

logger = logging.getLogger("dashboard_news")

# Free, public RSS feeds covering Greek + EU real estate / property markets.
FEED_SOURCES = [
    {
        "name":   "Ekathimerini · Economy",
        "url":    "https://www.ekathimerini.com/economy/feed/",
        "weight": 3.0,
    },
    {
        "name":   "GTP Headlines · Greece",
        "url":    "https://news.gtp.gr/feed/",
        "weight": 2.0,
    },
    {
        "name":   "Greek Reporter",
        "url":    "https://greekreporter.com/feed/",
        "weight": 1.5,
    },
    {
        "name":   "Reuters · Real Estate",
        "url":    "https://feeds.reuters.com/reuters/businessNews",
        "weight": 1.0,
    },
]

# Keywords used to score relevance — higher score = more on-topic.
REAL_ESTATE_KEYWORDS = {
    # Core property terms (high weight)
    "real estate": 6, "property prices": 6, "property market": 5,
    "housing market": 5, "housing prices": 5, "apartment prices": 5,
    "rental market": 5, "short-term rental": 6, "airbnb": 5,
    "str regulation": 6, "golden visa": 6, "zoning": 5,
    "building permits": 5, "construction": 4, "development": 4,
    "investment zone": 5, "investment fund": 4, "reit": 5,
    "hospitality investment": 5, "hotel development": 5,
    "resort development": 5, "land prices": 5, "marina": 4,
    "urban planning": 4, "infrastructure": 3,
    "residential": 3, "commercial property": 5, "offices": 3,
    "property": 4, "apartment": 3, "rental": 3, "rent": 3,
    "housing": 4, "hospitality": 4, "hotel": 3, "yield": 3,
    "tourism investment": 4, "ellinikon": 5, "metro extension": 4,
    "athens riviera": 5,
    # Country / city tagging (slightly down-weighted since they're broad)
    "athens": 2, "greece": 1, "greek": 1, "thessaloniki": 2,
    "mykonos": 3, "santorini": 3, "crete": 2,
}

# Hard-exclusion keywords — if ANY of these appears, drop the article.
# Tuned to user mandate: no politics, crime, accidents, celebrity, sports etc.
EXCLUDED_KEYWORDS = (
    # Crime / violence
    "murder", "killed", "stabbing", "stabbed", "shooting", "homicide",
    "rape", "assault", "abduction", "robbery", "burglar", "kidnap",
    "suicide", "attempt to kill", "killed himself", "killed herself",
    # Accidents / disasters
    "accident", "crashed", "collision", "wildfire", "earthquake",
    "tsunami", "drowned", "flood damage", "tragedy",
    # Politics / war (NOT investment policy)
    "election", "elections", "vote", "ballot", "parliamentary",
    "prime minister", "opposition party", "coalition government",
    "protest", "demonstration", "riot", "strike",
    "ukraine war", "war in", "weapons", "missile", "airstrike",
    "scandal", "corruption case", "court ruling", "court case",
    "indicted", "convicted", "lawsuit",
    # Celebrity / sports / health / school
    "celebrity", "actor", "actress", "singer", "musician",
    "olympics", "football", "soccer match", "basketball",
    "tennis tournament", "boxing", "wrestling",
    "covid", "outbreak", "epidemic", "pandemic",
    "school shooting", "student protest", "university strike",
    # Misc unrelated
    "horoscope", "weather report", "fashion week",
)

# Lower bound on the keyword score to include an article.
MIN_RELEVANCE = 5

USER_AGENT = "Propul8 Dashboard/1.0 (hospitality@propos.app)"
NAMESPACES = {"atom": "http://www.w3.org/2005/Atom"}


def _strip_html(text: str) -> str:
    """Minimal HTML stripper — RSS descriptions are full of <p>, <a>, &nbsp; …"""
    text = re.sub(r"<[^>]+>", "", text or "")
    text = re.sub(r"&[a-z]+;", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _score_relevance(title: str, description: str) -> int:
    haystack = f"{title} {description}".lower()
    # HARD exclude — any blacklisted token kills the article outright.
    for kw in EXCLUDED_KEYWORDS:
        if kw in haystack:
            return 0
    score = 0
    for kw, weight in REAL_ESTATE_KEYWORDS.items():
        if kw in haystack:
            score += weight
    return score


def _parse_pubdate(s: str) -> Optional[datetime]:
    if not s:
        return None
    # RFC 822 (Tue, 11 Feb 2026 09:00:00 GMT)
    fmts = [
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S %z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
    ]
    for f in fmts:
        try:
            return datetime.strptime(s.strip(), f).astimezone(timezone.utc)
        except ValueError:
            continue
    return None


async def _fetch_feed(client: httpx.AsyncClient, src: Dict[str, Any]) -> List[Dict[str, Any]]:
    try:
        r = await client.get(src["url"], timeout=10)
        r.raise_for_status()
        # Strip BOM, sometimes present
        xml_text = r.text.lstrip("\ufeff")
        root = ET.fromstring(xml_text)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"feed {src['name']} fetch failed: {exc}")
        return []

    items: List[Dict[str, Any]] = []

    # RSS 2.0 path
    channel = root.find("channel")
    rss_items = channel.findall("item") if channel is not None else []
    for it in rss_items[:30]:
        title       = _strip_html((it.findtext("title") or "").strip())
        description = _strip_html((it.findtext("description") or "").strip())[:280]
        link        = (it.findtext("link") or "").strip()
        pub         = _parse_pubdate(it.findtext("pubDate") or "")
        if not title or not link:
            continue
        items.append({
            "title": title, "description": description, "url": link,
            "published_at": pub.isoformat() if pub else None,
            "source": src["name"], "source_weight": src["weight"],
        })

    # Atom path
    if not items:
        for it in root.findall("atom:entry", NAMESPACES)[:30]:
            title = _strip_html((it.findtext("atom:title", "", NAMESPACES) or "").strip())
            link_el = it.find("atom:link", NAMESPACES)
            link = (link_el.get("href") if link_el is not None else "").strip()
            summary = _strip_html((it.findtext("atom:summary", "", NAMESPACES) or "").strip())[:280]
            pub = _parse_pubdate(it.findtext("atom:updated", "", NAMESPACES) or "")
            if not title or not link:
                continue
            items.append({
                "title": title, "description": summary, "url": link,
                "published_at": pub.isoformat() if pub else None,
                "source": src["name"], "source_weight": src["weight"],
            })

    return items


async def fetch_athens_news(*, cache_db=None, limit: int = 6) -> List[Dict[str, Any]]:
    """Return up to `limit` relevant Athens / Greek real-estate news items.

    Cache TTL: 30 minutes. Falls back to the curated baseline if every feed
    fails (e.g. all network endpoints blocked)."""
    cache_key = "athens_re_news_v2"
    if cache_db is not None:
        try:
            cached = await cache_db["news_cache"].find_one({"key": cache_key}, {"_id": 0})
            if cached:
                gen_at = cached["generated_at"]
                if gen_at.tzinfo is None:
                    gen_at = gen_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) - gen_at < timedelta(minutes=30):
                    return cached["items"][:limit]
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"news cache read failed: {exc}")

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(headers=headers, timeout=12.0) as client:
        results = await asyncio.gather(
            *(_fetch_feed(client, src) for src in FEED_SOURCES),
            return_exceptions=False,
        )

    pool: List[Dict[str, Any]] = []
    for batch in results:
        pool.extend(batch)

    # Relevance filter + score
    ranked: List[Dict[str, Any]] = []
    for item in pool:
        rel = _score_relevance(item["title"], item.get("description", ""))
        if rel < MIN_RELEVANCE:
            continue
        item["relevance"] = rel
        # Composite score = relevance × source weight × recency boost
        recency_boost = 1.0
        if item.get("published_at"):
            try:
                dt = datetime.fromisoformat(item["published_at"])
                hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
                recency_boost = max(0.4, 1.0 - hours / (24 * 7))
            except ValueError:
                pass
        item["_score"] = rel * item["source_weight"] * recency_boost
        ranked.append(item)

    ranked.sort(key=lambda x: x["_score"], reverse=True)

    # De-dupe by title (rough)
    seen_titles: set = set()
    deduped: List[Dict[str, Any]] = []
    for item in ranked:
        key = item["title"][:60].lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        item.pop("_score", None)
        item.pop("source_weight", None)
        item.pop("relevance", None)
        deduped.append(item)
        if len(deduped) >= limit:
            break

    # Fallback if everything failed
    if not deduped:
        deduped = _baseline_items()[:limit]

    # Cache
    if cache_db is not None:
        try:
            await cache_db["news_cache"].update_one(
                {"key": cache_key},
                {"$set": {
                    "key": cache_key,
                    "generated_at": datetime.now(timezone.utc),
                    "items": deduped,
                }},
                upsert=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"news cache write failed: {exc}")

    return deduped[:limit]


def _baseline_items() -> List[Dict[str, Any]]:
    """Last-resort baseline if every feed is unreachable. Strict real-estate
    only — never general news. Marked as 'Curated baseline'."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return [
        {
            "title":       "Greek property market sustains steady growth amid foreign demand",
            "description": "Athens residential prices continue their post-2023 climb as Golden Visa applications hold firm above 2024 averages.",
            "url":         "https://www.ekathimerini.com/economy/",
            "published_at": today,
            "source":      "Curated baseline · Real Estate",
        },
        {
            "title":       "Short-term rentals face new regulatory framework in 2026",
            "description": "New STR rules impact licensing for Airbnb-style listings in central Athens municipalities and revise tax treatment for hospitality assets.",
            "url":         "https://www.ekathimerini.com/economy/",
            "published_at": today,
            "source":      "Curated baseline · Real Estate",
        },
        {
            "title":       "Athens Riviera redevelopment moves to next construction phase",
            "description": "The Ellinikon megaproject accelerates infrastructure works as marina and residential towers approach delivery — driving land prices across the southern suburbs.",
            "url":         "https://www.ekathimerini.com/economy/",
            "published_at": today,
            "source":      "Curated baseline · Real Estate",
        },
        {
            "title":       "ECB rate posture keeps Greek mortgage rates near multi-quarter lows",
            "description": "Hospitality asset financing remains attractive for institutional acquirers across Athens, Mykonos and Crete.",
            "url":         "https://www.ekathimerini.com/economy/",
            "published_at": today,
            "source":      "Curated baseline · Real Estate",
        },
    ]
