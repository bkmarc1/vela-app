"""Iter 58 — Embedded Location Intelligence backend regression."""
import os
import time
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api/location"


# --- /provider regression ---------------------------------------------------
def test_provider_still_osm():
    r = requests.get(f"{API}/provider", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["provider"] == "openstreetmap"
    assert data["google_configured"] is False


# --- /analyze Koukaki Athens (the demo address for embedded sections) -------
def test_analyze_koukaki_athens_greece():
    payload = {"address": "Koukaki, Athens, Greece"}
    t0 = time.time()
    r = requests.post(f"{API}/analyze", json=payload, timeout=60)
    elapsed = time.time() - t0
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    data = r.json()
    # core shape
    assert "scores" in data
    sc = data["scores"]
    for k in ("location", "walkability", "tourism", "beach_marina", "convenience"):
        assert k in sc and 0 <= sc[k] <= 10
    assert data["verdict"] in {"Weak", "Average", "Strong", "Prime"}
    # Resolved must be Greece, not Athens GA
    resolved = (data.get("resolved_address") or "").lower()
    assert "greece" in resolved or "ελλ" in resolved, f"resolved_address not Greece: {resolved}"
    # no mongo _id leak
    assert "_id" not in data
    # source must be OSM
    assert data["source"] == "openstreetmap"
    print(f"Koukaki Athens score={sc['location']}, verdict={data['verdict']}, cached={data['cached']}, took {elapsed:.2f}s")


def test_analyze_koukaki_cache_hit():
    # Second call should be sub-3s and cached
    payload = {"address": "Koukaki, Athens, Greece"}
    t0 = time.time()
    r = requests.post(f"{API}/analyze", json=payload, timeout=30)
    elapsed = time.time() - t0
    assert r.status_code == 200
    data = r.json()
    assert data["cached"] is True, "Koukaki should be warm in cache"
    assert elapsed < 3.0, f"cache slow: {elapsed:.2f}s"


# --- Regression: sources endpoint ------------------------------------------
def test_sources_demo_regression():
    r = requests.get(f"{BASE_URL}/api/sources/demo", timeout=15)
    assert r.status_code in (200, 404), f"got {r.status_code}"
