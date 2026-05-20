"""Iter20 — backend regression sweep + _dedupe_properties unit tests.

Covers:
- _dedupe_properties helper logic (canonical URL collapse + name+city fallback + newest wins)
- /api/properties auth gating (helper is invoked only via authed GET)
- Public regression: /api/properties/demo, /api/portfolio/demo, /api/visualize,
  /api/upgrade/cart, /api/upgrade/listing, /api/ingest/listing-url, /api/visual-analysis
"""
import os
import sys
import pytest
import requests

# Allow importing server module for direct helper unit tests
sys.path.insert(0, "/app/backend")
from server import _dedupe_properties, _canonical_listing_url  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


# ---------------- _dedupe_properties unit tests ----------------
class TestDedupeHelper:
    def test_collapse_same_canonical_url_newest_wins(self):
        docs = [
            {"property_id": "p1", "_canonical_url": "https://airbnb.com/rooms/123",
             "name": "Loft", "analyzed_at": "2026-01-01T00:00:00Z", "asset_score": 70},
            {"property_id": "p2", "_canonical_url": "https://airbnb.com/rooms/123",
             "name": "Loft", "analyzed_at": "2026-01-15T00:00:00Z", "asset_score": 82},
        ]
        out = _dedupe_properties(docs)
        assert len(out) == 1
        assert out[0]["property_id"] == "p2"
        assert out[0]["asset_score"] == 82

    def test_canonical_url_computed_from_listing_url_when_missing(self):
        docs = [
            {"property_id": "p1", "listing_url": "https://airbnb.com/rooms/9?x=1",
             "analyzed_at": "2026-01-01T00:00:00Z"},
            {"property_id": "p2", "listing_url": "https://airbnb.com/rooms/9?y=2",
             "analyzed_at": "2026-02-01T00:00:00Z"},
        ]
        out = _dedupe_properties(docs)
        assert len(out) == 1
        assert out[0]["property_id"] == "p2"

    def test_name_city_type_fallback_collapses_urlless_imports(self):
        docs = [
            {"property_id": "p1", "name": "Casa Rosa", "city": "Lisbon",
             "property_type": "apartment", "analyzed_at": "2026-01-01T00:00:00Z"},
            {"property_id": "p2", "name": "Casa Rosa", "city": "Lisbon",
             "property_type": "apartment", "analyzed_at": "2026-03-01T00:00:00Z"},
        ]
        out = _dedupe_properties(docs)
        assert len(out) == 1
        assert out[0]["property_id"] == "p2"

    def test_different_assets_kept_distinct(self):
        docs = [
            {"property_id": "p1", "_canonical_url": "https://airbnb.com/rooms/1",
             "name": "A", "analyzed_at": "2026-01-01T00:00:00Z"},
            {"property_id": "p2", "_canonical_url": "https://airbnb.com/rooms/2",
             "name": "B", "analyzed_at": "2026-01-01T00:00:00Z"},
        ]
        out = _dedupe_properties(docs)
        assert len(out) == 2

    def test_identityless_records_use_property_id_so_no_collapse(self):
        docs = [
            {"property_id": "p1"},
            {"property_id": "p2"},
        ]
        out = _dedupe_properties(docs)
        assert len(out) == 2

    def test_empty_input(self):
        assert _dedupe_properties([]) == []
        assert _dedupe_properties(None) == []

    def test_canonical_listing_url_strips_query_fragment(self):
        a = _canonical_listing_url("https://Airbnb.com/rooms/12345?si=abc#frag")
        b = _canonical_listing_url("https://airbnb.com/rooms/12345/")
        assert a == b == "https://airbnb.com/rooms/12345"


# ---------------- Auth gating ----------------
class TestAuthGated:
    def test_get_properties_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/properties", timeout=20)
        assert r.status_code in (401, 403, 404), f"got {r.status_code}"


# ---------------- Public regression ----------------
class TestPublicRegression:
    def test_property_demo(self):
        r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "property_id" in d or "name" in d

    def test_portfolio_demo(self):
        r = requests.get(f"{BASE_URL}/api/portfolio/demo", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("properties"), list)
        assert len(d["properties"]) >= 1

    REC = {
        "id": "rec_0",
        "title": "Sleep capacity expansion",
        "summary": "Add a mezzanine sleeping loft to increase sleeps from 4 to 5.",
        "category": "layout",
        "impact": "+€8,900/yr",
        "effort": "moderate",
    }

    def test_visualize(self):
        r = requests.post(
            f"{BASE_URL}/api/visualize",
            json={"property_id": "demo", "recommendation": self.REC},
            timeout=60,
        )
        assert r.status_code == 200, r.text[:300]

    def test_upgrade_cart(self):
        r = requests.post(
            f"{BASE_URL}/api/upgrade/cart",
            json={
                "property_id": "demo",
                "recommendation": self.REC,
                "selections": [{"recommendation_id": "rec_0", "concept_id": "mezzanine_loft"}],
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]

    def test_upgrade_listing(self):
        r = requests.post(
            f"{BASE_URL}/api/upgrade/listing",
            json={
                "property_id": "demo",
                "recommendation": self.REC,
                "selections": [{"recommendation_id": "rec_0", "concept_id": "mezzanine_loft"}],
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]

    def test_ingest_listing_url(self):
        r = requests.post(
            f"{BASE_URL}/api/ingest/listing-url",
            json={"url": "https://www.airbnb.com/rooms/12345678"},
            timeout=60,
        )
        # Ingest may 200 (parsed) or graceful 4xx; never 500
        assert r.status_code < 500, r.text[:300]

    def test_visual_analysis_error_fast(self):
        # Empty url => 400, never 500
        r = requests.post(
            f"{BASE_URL}/api/visual-analysis",
            json={"image_url": ""},
            timeout=20,
        )
        assert r.status_code == 400, r.text[:300]
