"""Iter16 — Recommendation-aware /api/visualize tests.

Tests that POST /api/visualize resolves family/keys from rec.title and returns
3 strategic execution paths (NOT aesthetic moodboards) per family.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
TIMEOUT = 120

EXPECTED = {
    "Sleep Capacity Expansion":      ("sleep",    {"mezzanine_loft", "convertible_living", "bunk_millwork"}),
    "Layered Evening Lighting":      ("lighting", {"programmed_scenes", "sculptural_focals", "architectural_cove"}),
    "Outdoor Dining Program":        ("outdoor",  {"sunset_theatre", "indoor_outdoor_flow", "modular_outdoor"}),
    "Editorial Photography Refresh": ("photo",    {"golden_hour_editorial", "lifestyle_storytelling", "architectural_studio"}),
    "Dynamic Pricing Strategy":      ("pricing",  {"four_band_seasonal", "length_of_stay", "demand_premium"}),
}

LEGACY_KEYS = {"family_premium", "editorial_boutique", "romantic_escape",
               "minimal_cycladic", "warm_editorial", "mediterranean_contemporary"}


def _payload(rec_title):
    return {
        "property": {
            "title": "Demo Villa", "city": "Paros", "country": "Greece",
            "bedrooms": 2, "sleeps": 4, "adr": 145, "occupancy_pct": 71,
            "amenities": ["wifi", "pool"]
        },
        "recommendation": {"title": rec_title, "category": "ops"}
    }


@pytest.mark.parametrize("title,expected", list(EXPECTED.items()))
def test_visualize_family_resolves(title, expected):
    expected_family, expected_keys = expected
    r = requests.post(f"{BASE_URL}/api/visualize", json=_payload(title), timeout=TIMEOUT)
    assert r.status_code == 200, f"{title} → {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert data.get("family") == expected_family, f"{title}: family={data.get('family')} expected {expected_family}"
    concepts = data.get("concepts") or []
    assert len(concepts) == 3, f"{title}: got {len(concepts)} concepts"
    keys = {c.get("key") for c in concepts}
    assert keys == expected_keys, f"{title}: keys={keys} expected {expected_keys}"
    # No legacy keys should appear
    assert not (keys & LEGACY_KEYS), f"{title}: legacy keys detected {keys & LEGACY_KEYS}"
    # Each concept has required strategic fields
    required = {"name", "strategy", "atmosphere", "mood", "execution",
                "cost_band", "complexity", "disruption", "when_to_choose",
                "intel", "adr_uplift_pct", "furniture", "lighting", "materials"}
    for c in concepts:
        missing = required - set(c.keys())
        assert not missing, f"{title}/{c.get('key')}: missing {missing}"
        assert isinstance(c["furniture"], list) and c["furniture"]
        assert isinstance(c["lighting"], list) and c["lighting"]
        assert isinstance(c["materials"], list) and c["materials"]


def test_visualize_image_returns_data_url():
    """Try ONE image gen call for new strategic key. 502 cold-start = INFO/skip."""
    payload = {
        "concept_key": "mezzanine_loft",
        "concept": {
            "key": "mezzanine_loft",
            "name": "Mezzanine Sleep Platform",
            "atmosphere": "Architectural oak mezzanine bed platform above living area.",
            "mood": "Calm honey-oak millwork, warm 2700K cove glow.",
        },
        "property": {"title": "Demo Villa", "city": "Paros", "country": "Greece"}
    }
    try:
        r = requests.post(f"{BASE_URL}/api/visualize/image", json=payload, timeout=180)
    except requests.exceptions.RequestException as e:
        pytest.skip(f"INFO: network/cold-start: {e}")
    if r.status_code == 502:
        pytest.skip("INFO: 502 cold-start treated as PASS per spec")
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    img = data.get("data_url") or data.get("image") or data.get("url")
    assert img and isinstance(img, str) and len(img) > 50
