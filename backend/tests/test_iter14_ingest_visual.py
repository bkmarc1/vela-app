"""
Iter14 — Propul8 aesthetic refinement round 2 backend regression.

Coverage:
  • POST /api/ingest/listing-url   — NEW 'images' (List[str]) + 'visual_analysis' (dict) fields
  • POST /api/visualize            — still returns 3 family_premium/editorial_boutique/romantic_escape concepts
  • POST /api/visualize/image      — still 200/cold-start clean for new keys
  • GET  /api/properties/demo      — backwards-compatible payload
  • GET  /api/properties/demo/portfolio
  • POST /api/upgrade/cart         — still 200
  • POST /api/upgrade/listing      — still 200
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://hospitality-ai-12.preview.emergentagent.com",
).rstrip("/")

NEW_KEYS = {"family_premium", "editorial_boutique", "romantic_escape"}

DEMO_RECOMMENDATION = {
    "title": "Sleep Capacity Expansion",
    "transformation": "4 → 5 Guests",
    "revenue_impact": "+€1,500/year",
    "cost": "€3,530",
    "payback": "28 months",
    "status": "Ready to Activate",
}
DEMO_PROPERTY = {
    "property_id": "demo",
    "name": "Cycladic Boutique Suite",
    "city": "Koufonisia, Greece",
    "property_type": "Boutique Suite",
    "sqm": 78,
    "bedrooms": 1,
    "bathrooms": 1,
    "sleeps": 4,
    "nightly_rate": 145,
}


# --- Health -----------------------------------------------------------
def test_health():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200


# --- /api/ingest/listing-url  (iter14 focus) -------------------------
class TestIngestListingUrl:
    def test_ingest_returns_images_and_visual_analysis(self):
        payload = {"url": "https://www.airbnb.com/rooms/12345"}
        r = requests.post(
            f"{BASE_URL}/api/ingest/listing-url",
            json=payload,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()

        # NEW field 1 — images is a list of strings (may be empty if scrape was blocked)
        assert "images" in data, data.keys()
        assert isinstance(data["images"], list)
        for img in data["images"]:
            assert isinstance(img, str)
            assert img.startswith("http")

        # NEW field 2 — visual_analysis must be a dict with the documented keys
        assert "visual_analysis" in data, data.keys()
        va = data["visual_analysis"]
        assert isinstance(va, dict)
        for k in (
            "photo_count",
            "photo_volume_score",
            "consistency_score",
            "thumbnail_strength",
            "overall_score",
            "hospitality_style",
            "notes",
        ):
            assert k in va, f"visual_analysis missing key: {k} (keys={list(va.keys())})"

        # type checks
        assert isinstance(va["photo_count"], int)
        assert isinstance(va["photo_volume_score"], int)
        assert isinstance(va["consistency_score"], int)
        assert isinstance(va["thumbnail_strength"], int)
        assert isinstance(va["overall_score"], int)
        assert isinstance(va["hospitality_style"], str) and va["hospitality_style"]
        assert isinstance(va["notes"], list)
        assert all(isinstance(n, str) for n in va["notes"])

        # photo_count must equal len(images)
        assert va["photo_count"] == len(data["images"])

        # scores are clamped 0..100
        for k in ("photo_volume_score", "consistency_score", "thumbnail_strength", "overall_score"):
            assert 0 <= va[k] <= 100, f"{k}={va[k]} out of range"

        # Backwards-compat: legacy fields still present
        for k in ("name", "city", "property_type", "sleeps"):
            assert k in data, f"legacy key missing: {k}"

    def test_ingest_rejects_non_http_url(self):
        r = requests.post(
            f"{BASE_URL}/api/ingest/listing-url",
            json={"url": "not-a-url"},
            timeout=15,
        )
        assert r.status_code == 400


# --- /api/visualize regression --------------------------------------
class TestVisualizeRegression:
    def test_visualize_three_new_keys(self):
        r = requests.post(
            f"{BASE_URL}/api/visualize",
            json={"recommendation": DEMO_RECOMMENDATION, "property": DEMO_PROPERTY},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        concepts = data.get("concepts") or []
        assert len(concepts) == 3
        keys = {c.get("key") for c in concepts}
        assert keys == NEW_KEYS

    def test_visualize_image_for_new_key(self):
        concept = {
            "key": "family_premium",
            "name": "Family Premium",
            "atmosphere": "Calm, durable, warm.",
            "palette": ["#E8DFD2", "#C9B89A", "#7A6F5C"],
            "furniture": ["Oak bench", "Linen sofa"],
            "lighting": ["2700K layered"],
            "materials": ["Honed limestone"],
            "direction": "Sleeps-5 design-led family inventory",
        }
        r = requests.post(
            f"{BASE_URL}/api/visualize/image",
            json={"concept": concept, "property": DEMO_PROPERTY},
            timeout=180,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"Cold-start upstream {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        url_field = data.get("data_url") or data.get("url") or data.get("image_url")
        assert isinstance(url_field, str) and len(url_field) > 0


# --- Property + portfolio regression --------------------------------
class TestPropertiesDemo:
    def test_get_property_demo(self):
        r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # essential keys for FE
        for k in ("name", "city", "nightly_rate"):
            assert k in data, k

    def test_get_portfolio_demo(self):
        # Real route is /api/portfolio/demo
        r = requests.get(f"{BASE_URL}/api/portfolio/demo", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        rows = data.get("properties") if isinstance(data, dict) else data
        assert isinstance(rows, list) and len(rows) >= 1


# --- Upgrade endpoints regression -----------------------------------
class TestUpgradeEndpoints:
    def test_upgrade_cart(self):
        payload = {
            "recommendation": DEMO_RECOMMENDATION,
            "property": DEMO_PROPERTY,
            "concept_key": "family_premium",
        }
        # Cold-start LLM may push past gateway timeout — retry once
        for attempt in range(2):
            r = requests.post(f"{BASE_URL}/api/upgrade/cart", json=payload, timeout=180)
            if r.status_code == 200:
                break
            if r.status_code in (502, 503, 504):
                time.sleep(5)
                continue
            break
        if r.status_code in (502, 503, 504):
            pytest.skip(f"Gateway cold-start {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, dict)

    def test_upgrade_listing(self):
        payload = {
            "recommendation": DEMO_RECOMMENDATION,
            "property": DEMO_PROPERTY,
            "concept_key": "family_premium",
        }
        for attempt in range(2):
            r = requests.post(f"{BASE_URL}/api/upgrade/listing", json=payload, timeout=180)
            if r.status_code == 200:
                break
            if r.status_code in (502, 503, 504):
                time.sleep(5)
                continue
            break
        if r.status_code in (502, 503, 504):
            pytest.skip(f"Gateway cold-start {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, dict)
