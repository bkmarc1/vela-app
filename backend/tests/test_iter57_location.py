"""Iter 57 — Location Intelligence backend tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env value if env not set
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api/location"


# --- /provider --------------------------------------------------------------
def test_provider_status():
    r = requests.get(f"{API}/provider", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["provider"] == "openstreetmap"
    assert data["google_configured"] is False


# --- /analyze: Glyfada full flow + cache ------------------------------------
def _validate_full_payload(data):
    # scores shape
    assert "scores" in data
    sc = data["scores"]
    for k in ("location", "walkability", "tourism", "beach_marina", "convenience"):
        assert k in sc, f"missing score {k}"
        assert isinstance(sc[k], (int, float))
        assert 0 <= sc[k] <= 10
    # verdict
    assert data["verdict"] in {"Weak", "Average", "Strong", "Prime"}
    # arrays
    assert isinstance(data["top_drivers"], list)
    assert len(data["top_drivers"]) <= 5
    assert isinstance(data["top_weaknesses"], list)
    assert len(data["top_weaknesses"]) <= 3
    assert isinstance(data["noise_risk_notes"], list)
    # counts
    nc = data["nearby_counts"]
    for cat in ("restaurant", "cafe", "supermarket", "metro", "beach",
                "marina", "landmark", "nightlife", "hospital", "pharmacy", "airport"):
        assert cat in nc
        assert isinstance(nc[cat], int)
    # travel summary
    assert isinstance(data["travel_summary"], list)
    for item in data["travel_summary"]:
        for k in ("name", "category", "lat", "lng", "distance_m", "walk_min", "drive_min"):
            assert k in item
        assert isinstance(item["lat"], (int, float))
        assert isinstance(item["lng"], (int, float))
        assert isinstance(item["walk_min"], int)
    # source
    assert data["source"] == "openstreetmap"
    # ISO datetime
    assert isinstance(data["generated_at"], str)
    assert "T" in data["generated_at"]
    # cached bool
    assert isinstance(data["cached"], bool)
    # no mongo _id leakage
    assert "_id" not in data


def test_analyze_glyfada_full_and_cache():
    payload = {"address": "Glyfada, Athens, Greece"}
    t0 = time.time()
    r = requests.post(f"{API}/analyze", json=payload, timeout=60)
    elapsed_first = time.time() - t0
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    d1 = r.json()
    _validate_full_payload(d1)
    # Glyfada-specific assertions
    assert d1["scores"]["beach_marina"] > 6, f"expected beach>6, got {d1['scores']['beach_marina']}"
    assert d1["nearby_counts"]["beach"] >= 3, f"expected >=3 beaches, got {d1['nearby_counts']['beach']}"
    print(f"Glyfada first call took {elapsed_first:.2f}s, score={d1['scores']['location']}, verdict={d1['verdict']}")

    # 2nd call -> cached
    t0 = time.time()
    r2 = requests.post(f"{API}/analyze", json=payload, timeout=30)
    elapsed_second = time.time() - t0
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["cached"] is True, "second call should be cached"
    assert d2["scores"]["location"] == d1["scores"]["location"], "cached scores must match"
    assert elapsed_second < 3.0, f"cached call too slow: {elapsed_second:.2f}s"
    print(f"Glyfada cache hit: {elapsed_second*1000:.0f}ms")


# --- /analyze: lat/lng-only -------------------------------------------------
def test_analyze_lat_lng_only():
    r = requests.post(f"{API}/analyze", json={"lat": 37.97, "lng": 23.72}, timeout=60)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    _validate_full_payload(data)


# --- /analyze: validation errors --------------------------------------------
def test_analyze_missing_body_returns_400():
    r = requests.post(f"{API}/analyze", json={}, timeout=15)
    assert r.status_code == 400


def test_analyze_invalid_address_graceful():
    r = requests.post(f"{API}/analyze", json={"address": "asdfqwerty12345xyz"}, timeout=60)
    # Should NOT 500. Accept 400 or 502 graceful error
    assert r.status_code in (400, 404, 422, 502), f"got {r.status_code}: {r.text[:200]}"


# --- Regression: prior endpoints --------------------------------------------
def test_regression_sources_endpoint():
    # Source Ledger v2 — sources/{asset_id} endpoint from iter 56
    r = requests.get(f"{BASE_URL}/api/sources/demo", timeout=15)
    # Should respond (200 or known 404), not 500
    assert r.status_code in (200, 404), f"got {r.status_code}"
