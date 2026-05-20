"""Iter62 backend tests — strict RE news filter, cache invalidation, regression."""
import os
import asyncio
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"

RE_KEYWORDS = [
    "real estate", "property", "housing", "rental", "rent ", "airbnb", "str",
    "golden visa", "zoning", "building permit", "construction", "development",
    "ellinikon", "marina", "residential", "commercial", "tourism investment",
    "hotel", "hospitality", "reit", "apartment", "athens riviera", "metro extension",
    "investment", "yield", "mortgage",
]

EXCLUDED = [
    "suicide", "murder", "killed", "stabbing", "shooting", "homicide",
    "rape", "robbery", "assault", "accident", "crashed", "collision",
    "election", "protest", "riot", "ukraine war", "scandal", "court ruling",
    "celebrity", "actor", "actress", "olympics", "football", "soccer match",
    "covid", "school shooting", "fashion week", "horoscope",
]


# ─── /api/dashboard/news strict filter ──────────────────────────────────
class TestNewsFilter:
    def test_news_endpoint_returns_items(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/news?limit=12", timeout=30)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"
        data = r.json()
        items = data.get("items") if isinstance(data, dict) else data
        assert isinstance(items, list), f"items not list: {type(items)}"
        assert len(items) > 0, "no news items returned"

    def test_every_item_has_re_keyword(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/news?limit=12", timeout=30)
        items = r.json().get("items") if isinstance(r.json(), dict) else r.json()
        bad = []
        for it in items:
            hay = f"{it.get('title','')} {it.get('description','')}".lower()
            if not any(kw in hay for kw in RE_KEYWORDS):
                bad.append(it.get("title", ""))
        assert not bad, f"items without RE keyword: {bad}"

    def test_no_excluded_keywords(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/news?limit=12", timeout=30)
        items = r.json().get("items") if isinstance(r.json(), dict) else r.json()
        leaked = []
        for it in items:
            hay = f"{it.get('title','')} {it.get('description','')}".lower()
            for kw in EXCLUDED:
                if kw in hay:
                    leaked.append((it.get("title", ""), kw))
        assert not leaked, f"BANNED keywords leaked: {leaked}"


# ─── Cache invalidation ─────────────────────────────────────────────────
class TestCacheBust:
    def test_cache_key_is_v2(self):
        async def _run():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            v2 = await db["news_cache"].find_one({"key": "athens_re_news_v2"})
            client.close()
            return v2

        v2_doc = asyncio.get_event_loop().run_until_complete(_run())
        # Trigger a hit so cache populates if not already
        if not v2_doc:
            requests.get(f"{BASE_URL}/api/dashboard/news?limit=6", timeout=30)
            v2_doc = asyncio.get_event_loop().run_until_complete(_run())
        assert v2_doc is not None, "v2 cache key not created"

    def test_fresh_fetch_after_cache_delete(self):
        async def _delete():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            await db["news_cache"].delete_many({})
            client.close()

        asyncio.get_event_loop().run_until_complete(_delete())
        r = requests.get(f"{BASE_URL}/api/dashboard/news?limit=12", timeout=45)
        assert r.status_code == 200
        items = r.json().get("items") if isinstance(r.json(), dict) else r.json()
        assert len(items) > 0
        # Verify filter still applies on fresh fetch
        for it in items:
            hay = f"{it.get('title','')} {it.get('description','')}".lower()
            for kw in EXCLUDED:
                assert kw not in hay, f"banned kw '{kw}' leaked after fresh fetch in: {it.get('title')}"


# ─── Regression — other endpoints still work ───────────────────────────
class TestRegression:
    def test_competition_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/competition", timeout=30)
        assert r.status_code == 200

    def test_location_analyze(self):
        r = requests.post(
            f"{BASE_URL}/api/location/analyze",
            json={"address": "Koukaki, Athens, Greece"},
            timeout=30,
        )
        assert r.status_code in (200, 201)

    def test_parse_brochure_empty_400(self):
        r = requests.post(f"{BASE_URL}/api/invest/parse-brochure", json={}, timeout=20)
        assert r.status_code in (400, 422)

    def test_sources_endpoint_exists(self):
        # Try the listing endpoint or a known id
        r = requests.get(f"{BASE_URL}/api/sources/test-id", timeout=15)
        # Either 404 (not found) or 200 — should NOT 500
        assert r.status_code in (200, 404, 422)
