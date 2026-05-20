"""Propul8 Iter9 backend tests — Nano Banana image gen + visualize concepts + demo regression."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── /api/properties/demo regression ─────────────────────────────────────
def test_demo_property_loads_with_yield_opportunities(session):
    r = session.get(f"{API}/properties/demo", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    analysis = body.get("analysis") or {}
    yields = analysis.get("yield_opportunities") or []
    assert len(yields) >= 4, f"expected >=4 yield opportunities, got {len(yields)}"


# ─── /api/visualize concepts ─────────────────────────────────────────────
def test_visualize_returns_three_concepts_with_revenue_fields(session):
    payload = {
        "property": {
            "name": "Cycladic Boutique Suite",
            "city": "Mykonos",
            "country": "Greece",
            "property_type": "Boutique Suite",
            "size_m2": 95,
        },
        "recommendation": {
            "title": "Editorial design refresh",
            "summary": "Reposition to design-led boutique segment.",
        },
    }
    r = session.post(f"{API}/visualize", json=payload, timeout=120)
    assert r.status_code == 200, r.text
    concepts = r.json().get("concepts", [])
    assert len(concepts) == 3, f"expected 3 concepts, got {len(concepts)}"
    required = {"current_adr", "projected_adr", "current_occupancy", "projected_occupancy", "annual_uplift", "intel"}
    for c in concepts:
        missing = required - set(c.keys())
        assert not missing, f"concept {c.get('key')} missing: {missing}"


# ─── /api/visualize/image — Gemini Nano Banana ────────────────────────────
@pytest.fixture(scope="module")
def image_payload():
    return {
        "concept": {
            "key": "minimal_cycladic",
            "name": "Minimal Cycladic",
            "atmosphere": "Architectural restraint, golden hour",
            "mood": "Editorial calm",
            "materials": ["Limewash walls", "Sun-bleached oak", "Charcoal stone"],
            "lighting": ["2700K layered evening", "Sculptural pendant"],
        },
        "property": {
            "city": "Mykonos",
            "property_type": "Boutique Suite",
            "name": "Cycladic Boutique Suite",
        },
    }


def test_visualize_image_first_call_returns_data_url(session, image_payload):
    r = session.post(f"{API}/visualize/image", json=image_payload, timeout=120)
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:400]}"
    body = r.json()
    assert "data_url" in body
    assert body["data_url"].startswith("data:image/"), body["data_url"][:60]
    # base64 image data — strip prefix and ensure >50KB raw payload
    raw_b64 = body["data_url"].split(",", 1)[1]
    assert len(raw_b64) > 50_000, f"image too small: {len(raw_b64)} bytes b64"
    assert "cached" in body


def test_visualize_image_second_call_is_cached(session, image_payload):
    # warm
    r0 = session.post(f"{API}/visualize/image", json=image_payload, timeout=120)
    assert r0.status_code == 200
    t0 = time.time()
    r = session.post(f"{API}/visualize/image", json=image_payload, timeout=20)
    elapsed = time.time() - t0
    assert r.status_code == 200
    body = r.json()
    assert body.get("cached") is True, body
    assert elapsed < 3.0, f"cached call too slow: {elapsed:.2f}s"
