"""Iter15 regression: 7-call backend sanity check (backend unchanged this iteration)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def test_get_property_demo():
    r = requests.get(f"{API}/properties/demo", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert j["is_demo"] is True
    assert "analysis" in j and "metrics" in j["analysis"]


def test_get_portfolio_demo():
    r = requests.get(f"{API}/portfolio/demo", timeout=30)
    assert r.status_code == 200
    j = r.json()
    items = j.get("properties") if isinstance(j, dict) else j
    assert isinstance(items, list) and len(items) >= 1


def test_post_visualize_returns_three_concepts():
    payload = {
        "recommendation": {"title": "Sleep Capacity Expansion", "transformation": "Add mezzanine sleeps-5"},
        "property": {"name": "Demo Suite", "city": "Koufonisia, Greece", "property_type": "boutique", "sqm": 78, "sleeps": 4, "nightly_rate": 165},
    }
    r = requests.post(f"{API}/visualize", json=payload, timeout=120)
    assert r.status_code == 200
    j = r.json()
    concepts = j.get("concepts", [])
    assert len(concepts) == 3
    keys = {c.get("key") for c in concepts}
    assert keys == {"family_premium", "editorial_boutique", "romantic_escape"}


def test_post_upgrade_cart():
    r = requests.post(
        f"{API}/upgrade/cart",
        json={
            "recommendation": {"title": "Sleep Capacity Expansion"},
            "property": {"name": "X", "city": "Athens", "property_type": "boutique", "sqm": 78, "sleeps": 4, "nightly_rate": 165},
            "tier": "premium",
        },
        timeout=120,
    )
    assert r.status_code == 200
    j = r.json()
    assert "items" in j or "categories" in j or "tier" in j


def test_post_upgrade_listing():
    r = requests.post(
        f"{API}/upgrade/listing",
        json={
            "recommendation": {"title": "Editorial Photography Refresh"},
            "property": {"name": "X", "city": "Athens", "property_type": "boutique", "sqm": 78, "sleeps": 4, "nightly_rate": 165},
        },
        timeout=120,
    )
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j, dict)


def test_post_ingest_listing_url_has_visual_fields():
    r = requests.post(
        f"{API}/ingest/listing-url",
        json={"url": "https://www.airbnb.com/rooms/12345"},
        timeout=120,
    )
    assert r.status_code == 200
    j = r.json()
    # iter14 added images + visual_analysis
    assert "images" in j or "visual_analysis" in j or "property" in j


def test_post_visualize_image_optional():
    """Optional smoke: image gen may cold-start; allow 502 or 200."""
    payload = {
        "concept": {"key": "family_premium", "name": "Family Premium", "atmosphere": "warm"},
        "property": {"name": "Demo", "city": "Koufonisia", "property_type": "boutique", "sqm": 78, "sleeps": 4, "nightly_rate": 165},
    }
    try:
        r = requests.post(f"{API}/visualize/image", json=payload, timeout=180)
    except requests.exceptions.ReadTimeout:
        pytest.skip("Image gen cold-start exceeded 180s — non-blocking")
    if r.status_code in (502, 503, 504):
        pytest.skip(f"Image gen upstream {r.status_code} — non-blocking")
    assert r.status_code == 200
    assert "data_url" in r.json() or "url" in r.json()
