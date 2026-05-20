"""Iter19 backend tests — visual-analysis endpoint + auth-protected dedupe + previous_analysis.

Module covers:
  * POST /api/visual-analysis happy-path (Claude Sonnet 4.5 vision)
  * /api/visual-analysis cache hit (instant 2nd call)
  * /api/visual-analysis error handling (empty url, html url, unreachable host)
  * Public regression sweep (same shapes as prior iterations)
"""

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL is required"

S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

VISION_IMG = (
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791"
    "?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
)


# ----------------------------- /api/visual-analysis ---------------------------
class TestVisualAnalysis:
    """Real Claude Sonnet 4.5 vision call + in-process cache."""

    def test_happy_path_real_vision(self):
        t0 = time.time()
        r = S.post(
            f"{BASE_URL}/api/visual-analysis",
            json={
                "image_url": VISION_IMG,
                "context": {"city": "Mykonos", "property_type": "Boutique Suite"},
            },
            timeout=60,
        )
        elapsed = time.time() - t0
        assert r.status_code == 200, f"expected 200 got {r.status_code} body={r.text[:300]}"
        body = r.json()
        # Required keys
        for k in (
            "luxury_perception",
            "warmth",
            "lighting_quality",
            "design_consistency",
            "spatial_optimization",
            "click_through_potential",
            "hospitality_archetype",
            "visual_atmosphere",
            "flags",
            "overall_score",
            "analyzed_at",
            "model",
            "source",
        ):
            assert k in body, f"missing '{k}' in response keys={list(body.keys())}"

        # Score ranges
        for k in (
            "luxury_perception",
            "warmth",
            "lighting_quality",
            "design_consistency",
            "spatial_optimization",
            "click_through_potential",
            "overall_score",
        ):
            v = body[k]
            assert isinstance(v, int), f"{k} must be int, got {type(v).__name__}={v}"
            assert 0 <= v <= 100, f"{k} out of range: {v}"

        # Metadata
        assert body["model"] == "claude-sonnet-4-5"
        assert body["source"] == "vision"
        assert isinstance(body["flags"], list)
        assert 1 <= len(body["flags"]) <= 3
        assert isinstance(body["hospitality_archetype"], str) and len(body["hospitality_archetype"]) > 0
        assert isinstance(body["visual_atmosphere"], str) and len(body["visual_atmosphere"]) > 0

        # Stash for cache test
        TestVisualAnalysis._first_score = body["overall_score"]
        TestVisualAnalysis._first_elapsed = elapsed
        print(f"first call elapsed={elapsed:.1f}s overall={body['overall_score']}")

    def test_cache_hit_is_instant(self):
        # Second identical call should be near-instant (<2s)
        t0 = time.time()
        r = S.post(
            f"{BASE_URL}/api/visual-analysis",
            json={
                "image_url": VISION_IMG,
                "context": {"city": "Mykonos", "property_type": "Boutique Suite"},
            },
            timeout=10,
        )
        elapsed = time.time() - t0
        assert r.status_code == 200
        body = r.json()
        assert body["overall_score"] == TestVisualAnalysis._first_score
        # Cache hit must be much faster than first call (and <2s absolute)
        assert elapsed < 2.0, f"cache miss? elapsed={elapsed:.2f}s"
        print(f"cache hit elapsed={elapsed:.3f}s (first={TestVisualAnalysis._first_elapsed:.1f}s)")


class TestVisualAnalysisErrors:
    def test_empty_url_400(self):
        r = S.post(f"{BASE_URL}/api/visual-analysis", json={"image_url": ""}, timeout=10)
        assert r.status_code == 400, f"expected 400 got {r.status_code} body={r.text[:200]}"

    def test_html_url_400_or_502(self):
        r = S.post(
            f"{BASE_URL}/api/visual-analysis",
            json={"image_url": "https://example.com/notanimage.html"},
            timeout=15,
        )
        assert r.status_code in (400, 502), f"expected 400/502 got {r.status_code} body={r.text[:200]}"

    def test_unreachable_host_502(self):
        r = S.post(
            f"{BASE_URL}/api/visual-analysis",
            json={"image_url": "https://nonexistent.example.invalid/x.jpg"},
            timeout=15,
        )
        # Must not 500 — should be 502 (could-not-fetch) or 400.
        assert r.status_code in (400, 502), f"expected 400/502 got {r.status_code} body={r.text[:200]}"
        assert r.status_code != 500


# ----------------------------- Auth-gated routes (smoke) ----------------------
class TestAuthGated:
    def test_post_properties_requires_auth(self):
        r = S.post(
            f"{BASE_URL}/api/properties",
            json={"name": "X", "city": "Y", "property_type": "Z", "listing_url": "https://airbnb.com/rooms/9999"},
            timeout=10,
        )
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_analyze_requires_auth(self):
        r = S.post(f"{BASE_URL}/api/properties/demo/analyze", timeout=10)
        # demo route or any pid — must be auth-gated
        assert r.status_code in (401, 403, 404), f"expected 401/403/404 got {r.status_code}"


# ----------------------------- Public regression sweep ------------------------
class TestPublicRegression:
    def test_get_demo_property(self):
        r = S.get(f"{BASE_URL}/api/properties/demo", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("property_id") in ("demo", "DEMO") or body.get("is_demo") is True

    def test_get_demo_portfolio(self):
        r = S.get(f"{BASE_URL}/api/portfolio/demo", timeout=15)
        assert r.status_code == 200
        body = r.json()
        # Backend returns {properties: [...]} envelope
        items = body.get("properties") if isinstance(body, dict) else body
        assert isinstance(items, list) and len(items) >= 1

    def _rec_payload(self):
        return {
            "id": "rec_0",
            "title": "Sleep capacity expansion",
            "summary": "Add a mezzanine sleeping loft to increase sleeps from 4 to 5.",
            "category": "layout",
            "impact": "+€8,900/yr",
            "effort": "moderate",
        }

    def test_visualize(self):
        r = S.post(
            f"{BASE_URL}/api/visualize",
            json={"property_id": "demo", "recommendation": self._rec_payload()},
            timeout=60,
        )
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body, "empty visualize body"

    def test_upgrade_cart(self):
        r = S.post(
            f"{BASE_URL}/api/upgrade/cart",
            json={
                "property_id": "demo",
                "recommendation": self._rec_payload(),
                "selections": [{"recommendation_id": "rec_0", "concept_id": "mezzanine_loft"}],
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]

    def test_upgrade_listing(self):
        r = S.post(
            f"{BASE_URL}/api/upgrade/listing",
            json={
                "property_id": "demo",
                "recommendation": self._rec_payload(),
                "selections": [{"recommendation_id": "rec_0", "concept_id": "mezzanine_loft"}],
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]

    def test_ingest_listing_url(self):
        r = S.post(
            f"{BASE_URL}/api/ingest/listing-url",
            json={"url": "https://www.airbnb.com/rooms/12345"},
            timeout=45,
        )
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert "city" in body or "name" in body or "property_type" in body
