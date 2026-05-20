"""
Propul8 Iter10 backend tests — POST /api/ingest/listing-url
Hybrid scrape -> AI extract -> safe fallback. Never fails (except 400 on bad scheme).
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
INGEST = f"{BASE_URL}/api/ingest/listing-url"

REQUIRED_FIELDS = {"name", "city", "property_type", "sleeps", "_provenance", "_source", "_url"}
PROVENANCE_REQUIRED_KEYS = {"name", "city", "sleeps", "bedrooms"}
ALLOWED_SOURCE = {"scraped", "inferred"}
ALLOWED_PROV = {"scraped", "inferred", "user"}


# --- Test 1: Valid Airbnb-like URL ----------------------------------------
def test_ingest_airbnb_like_url_returns_property_shape():
    body = {"url": "https://www.airbnb.com/rooms/12345678"}
    r = requests.post(INGEST, json=body, timeout=45)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
    data = r.json()
    missing = REQUIRED_FIELDS - set(data.keys())
    assert not missing, f"Missing required fields: {missing}. Got keys: {list(data.keys())}"
    assert isinstance(data["name"], str) and data["name"].strip(), "name must be non-empty string"
    assert isinstance(data["city"], str) and data["city"].strip(), "city must be non-empty string"
    assert isinstance(data["sleeps"], int) and data["sleeps"] > 0, f"sleeps invalid: {data.get('sleeps')}"
    assert data["property_type"], "property_type required"
    assert data["_url"] == body["url"]
    assert data["_source"] in ALLOWED_SOURCE

    prov = data["_provenance"]
    assert isinstance(prov, dict)
    missing_prov = PROVENANCE_REQUIRED_KEYS - set(prov.keys())
    assert not missing_prov, f"_provenance missing keys: {missing_prov}. Got: {list(prov.keys())}"
    for k in PROVENANCE_REQUIRED_KEYS:
        assert prov[k] in ALLOWED_PROV, f"_provenance[{k}]={prov[k]} not in {ALLOWED_PROV}"


# --- Test 2: Garbage URL (never fails, returns inferred) -------------------
def test_ingest_garbage_url_falls_back_inferred():
    body = {"url": "https://invalid.example.fake/x/something-cool-villa-mykonos"}
    r = requests.post(INGEST, json=body, timeout=45)
    assert r.status_code == 200, f"Must NOT 5xx on garbage URL. Got {r.status_code}: {r.text[:300]}"
    data = r.json()
    assert data["_source"] == "inferred", f"Expected _source=inferred, got {data.get('_source')}"
    assert isinstance(data.get("name"), str) and data["name"].strip(), "name should be inferred from slug"
    assert isinstance(data.get("city"), str) and data["city"].strip(), "city should be inferred"
    # provenance for name/city should be 'inferred' since no scrape
    prov = data.get("_provenance", {})
    assert prov.get("name") in ALLOWED_PROV
    assert prov.get("city") in ALLOWED_PROV


# --- Test 3: User-supplied nightly_rate + goal -----------------------------
def test_ingest_with_user_nightly_rate_marks_provenance_user():
    body = {
        "url": "https://www.airbnb.com/rooms/87654321",
        "nightly_rate": 219,
        "goal": "higher_adr",
    }
    r = requests.post(INGEST, json=body, timeout=45)
    assert r.status_code == 200
    data = r.json()
    assert data.get("nightly_rate") == 219, f"Expected nightly_rate=219, got {data.get('nightly_rate')}"
    prov = data.get("_provenance", {})
    assert prov.get("nightly_rate") == "user", f"Expected provenance.nightly_rate=user, got {prov.get('nightly_rate')}"


# --- Test 4: Non-http URL must 400 -----------------------------------------
def test_ingest_non_http_url_returns_400():
    body = {"url": "ftp://not-a-website.com/foo"}
    r = requests.post(INGEST, json=body, timeout=15)
    assert r.status_code == 400, f"Expected 400 for non-http URL, got {r.status_code}: {r.text[:200]}"


# --- Regression: demo property still healthy -------------------------------
def test_demo_property_regression():
    r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=15)
    assert r.status_code == 200
    data = r.json()
    # Asset Score 82 + yield_opportunities present
    analysis = data.get("analysis") or {}
    metrics = analysis.get("metrics") or {}
    score = metrics.get("asset_score") or analysis.get("asset_score") or data.get("asset_score")
    assert score == 82, f"Expected asset_score=82, got {score}"
    yields = analysis.get("yield_opportunities") or data.get("yield_opportunities") or []
    assert len(yields) >= 4, f"Expected >=4 yield_opportunities, got {len(yields)}"
