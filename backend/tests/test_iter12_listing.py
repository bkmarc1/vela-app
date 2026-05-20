"""Propul8 Iter12 — POST /api/upgrade/listing tests.

Validates structured editorial copy output, fallback behaviour, and cache.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
ENDPOINT = f"{BASE_URL}/api/upgrade/listing"

DEMO_PAYLOAD = {
    "recommendation": {
        "title": "Sleep Capacity Expansion",
        "transformation": "Convert lounge nook into a flexible third sleep zone for design-led families.",
        "detail": "Daybed + sliding screen reconfiguration",
    },
    "property": {
        "name": "Casa Lyra",
        "city": "Paros, Greece",
        "property_type": "Boutique Suite",
        "sleeps": 4,
        "nightly_rate": 245,
    },
    "concept": {"key": "cycladic", "name": "Cycladic Editorial", "atmosphere": "calm restraint"},
}


@pytest.fixture(scope="module")
def first_response():
    """Cold (or already cached) call — used by all subsequent tests."""
    r = requests.post(ENDPOINT, json=DEMO_PAYLOAD, timeout=120)
    return r


# ------- schema / contract -------
def test_status_200(first_response):
    assert first_response.status_code == 200, first_response.text


def test_required_fields_present(first_response):
    data = first_response.json()
    for key in ("title", "subhead", "description", "amenities",
                "sleeps_positioning", "guest_segment", "pricing_positioning"):
        assert key in data, f"missing {key}"
        assert data[key], f"empty {key}"


def test_title_is_string(first_response):
    data = first_response.json()
    assert isinstance(data["title"], str)
    assert len(data["title"]) > 0


def test_description_is_array_of_3(first_response):
    data = first_response.json()
    assert isinstance(data["description"], list), "description must be array"
    assert len(data["description"]) == 3, f"expected 3 paragraphs, got {len(data['description'])}"
    for p in data["description"]:
        assert isinstance(p, str) and len(p) > 0


def test_amenities_5_or_more_strings(first_response):
    data = first_response.json()
    assert isinstance(data["amenities"], list)
    assert len(data["amenities"]) >= 5, f"expected 5+ amenities, got {len(data['amenities'])}"
    for tag in data["amenities"]:
        assert isinstance(tag, str) and len(tag) > 0


def test_no_exclamation_marks(first_response):
    data = first_response.json()
    flat_parts = [
        data.get("title", ""),
        data.get("subhead", ""),
        " ".join(data.get("description", []) or []),
        " ".join(data.get("amenities", []) or []),
        data.get("sleeps_positioning", ""),
        data.get("guest_segment", ""),
        data.get("pricing_positioning", ""),
        " ".join(data.get("house_rules", []) or []),
    ]
    blob = " ".join(flat_parts)
    assert "!" not in blob, f"exclamation found in copy: {blob[:200]}"


# ------- cache -------
def test_cache_hit_under_2s(first_response):
    # 2nd identical request should be served from cache
    t0 = time.time()
    r2 = requests.post(ENDPOINT, json=DEMO_PAYLOAD, timeout=10)
    elapsed = time.time() - t0
    assert r2.status_code == 200
    assert elapsed < 2.0, f"cache hit took {elapsed:.2f}s (expected <2s)"
    # same payload
    assert r2.json() == first_response.json()


# ------- fallback robustness -------
def test_minimal_payload_returns_200():
    r = requests.post(ENDPOINT, json={"recommendation": {}, "property": {}}, timeout=120)
    assert r.status_code == 200
    data = r.json()
    # fallback or AI both must satisfy contract minimums
    assert "title" in data and data["title"]
    assert isinstance(data.get("description"), list)
    assert len(data.get("amenities", [])) >= 5


def test_empty_body_returns_422_or_200():
    # Pydantic should reject completely empty body (recommendation required)
    r = requests.post(ENDPOINT, json={}, timeout=120)
    assert r.status_code in (200, 422)
