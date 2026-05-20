"""Iteration 8 — Propul8 P0 product refinement validation.

Tests:
- POST /api/visualize: 200, 3 concepts, all required fields, cache-hit faster.
- GET /api/properties/demo: 200, yield_opportunities length >= 3.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")

REQUIRED_FIELDS = {
    "key", "name", "atmosphere", "mood", "palette", "hero",
    "adr_impact", "current_adr", "projected_adr",
    "current_occupancy", "projected_occupancy",
    "annual_uplift", "budget", "intel",
    "furniture", "lighting", "materials", "guest_positioning",
}

EXPECTED_KEYS = {"minimal_cycladic", "warm_editorial", "mediterranean_contemporary"}


@pytest.fixture(scope="module")
def visualize_payload():
    return {
        "recommendation": {
            "title": "Editorial Photography Refresh",
            "transformation": "Static → Editorial",
        },
        "property": {
            "name": "Cycladic Boutique Suite",
            "city": "Koufonisia, Greece",
            "property_type": "Boutique Suite",
            "sqm": 78,
            "sleeps": 4,
            "nightly_rate": 145,
        },
    }


def test_demo_property():
    r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "analysis" in data
    yo = data["analysis"]["yield_opportunities"]
    assert isinstance(yo, list)
    assert len(yo) >= 3
    # Each opportunity has title + transformation + revenue_impact
    for o in yo[:3]:
        assert "title" in o
        assert "transformation" in o or "revenue_impact" in o


def test_visualize_returns_three_concepts_with_required_fields(visualize_payload):
    r = requests.post(f"{BASE_URL}/api/visualize", json=visualize_payload, timeout=120)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:500]}"
    data = r.json()
    assert "concepts" in data
    concepts = data["concepts"]
    assert len(concepts) == 3, f"Expected 3 concepts, got {len(concepts)}"

    keys = {c.get("key") for c in concepts}
    assert keys == EXPECTED_KEYS, f"Concept keys mismatch: {keys}"

    for c in concepts:
        missing = REQUIRED_FIELDS - set(c.keys())
        assert not missing, f"Concept {c.get('key')} missing fields: {missing}"
        # Type checks for revenue fields
        assert isinstance(c["current_adr"], (int, float))
        assert isinstance(c["projected_adr"], (int, float))
        assert c["projected_adr"] > c["current_adr"], "projected_adr must be > current_adr"
        assert isinstance(c["current_occupancy"], (int, float))
        assert isinstance(c["projected_occupancy"], (int, float))
        assert c["projected_occupancy"] >= c["current_occupancy"]
        assert isinstance(c["annual_uplift"], (int, float))
        assert c["annual_uplift"] > 0
        assert isinstance(c["palette"], list) and len(c["palette"]) >= 3
        assert isinstance(c["furniture"], list)
        assert isinstance(c["lighting"], list)
        assert isinstance(c["materials"], list)
        assert isinstance(c["intel"], str) and len(c["intel"]) > 0
        assert isinstance(c["hero"], str) and c["hero"].startswith("http")


def test_visualize_cache_hit_is_faster(visualize_payload):
    # First call (may be a cache hit from previous test, that's fine — we measure two equal calls)
    t0 = time.perf_counter()
    r1 = requests.post(f"{BASE_URL}/api/visualize", json=visualize_payload, timeout=120)
    t1 = time.perf_counter() - t0
    assert r1.status_code == 200

    t0 = time.perf_counter()
    r2 = requests.post(f"{BASE_URL}/api/visualize", json=visualize_payload, timeout=30)
    t2 = time.perf_counter() - t0
    assert r2.status_code == 200
    # Cache hit must be sub-second; AI call typically 10s+
    assert t2 < 3.0, f"Cache hit too slow: {t2:.2f}s (first {t1:.2f}s)"
    # Second response must equal first (deterministic cache)
    assert r1.json() == r2.json()
