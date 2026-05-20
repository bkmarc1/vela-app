"""Iter40 — Propul8 INVEST multi-layer extraction tests.

Focus:
- POST /api/invest/ingest with E&V URL must return rich extraction
  (price, m2, rooms, bathrooms, year_built, neighborhood, property_type, etc).
- Confidence map shape covers all required keys.
- Bad URL inputs (empty, non-http) return 400.
- Non-existent / blocked URLs return gracefully (no 500).
- Drafts (POST/GET/PUT) work and user_verified is reflected in confidence.
- Smoke regression on /api/properties/demo, /api/upgrade/cart, /api/payments/checkout, /api/invest/analyze.
"""

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://hospitality-ai-12.preview.emergentagent.com"

EV_URL = "https://www.engelvoelkers.com/gr/en/exposes/0e03e66b-9954-5a5c-ba49-efac6f5435d8"
INVALID_URL = "https://invalid-domain-xyz-12345.test/listing"
AIRBNB_URL = "https://www.airbnb.com/rooms/26213628"

REQUIRED_CONF_KEYS = {
    "asking_price_eur", "m2", "city", "rooms", "bathrooms", "floor",
    "energy_class", "parking", "renovation_state", "property_type",
    "listing_source", "url", "year_built", "neighborhood", "description",
    "price_per_sqm_eur",
}
ALLOWED_CONF_VALUES = {"verified", "needs_review", "missing", "user_verified"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/invest/ingest ----------

@pytest.mark.timeout(60)
def test_ingest_engel_voelkers_extraction(session):
    """Critical iter40 acceptance: E&V URL must extract rich fields."""
    r = session.post(f"{BASE_URL}/api/invest/ingest", json={"url": EV_URL}, timeout=45)
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    data = r.json()

    # Required top-level fields
    assert data.get("asking_price_eur") == 1180000, f"price={data.get('asking_price_eur')}"
    assert data.get("m2") == 406, f"m2={data.get('m2')}"
    assert data.get("rooms") == 4, f"rooms={data.get('rooms')}"
    assert data.get("bathrooms") == 3, f"bathrooms={data.get('bathrooms')}"
    assert data.get("year_built") == 2005, f"year_built={data.get('year_built')}"
    assert data.get("renovation_state") == "refresh", f"renovation_state={data.get('renovation_state')}"
    assert data.get("city") == "Athens", f"city={data.get('city')}"
    assert "Adames" in (data.get("neighborhood") or ""), f"neighborhood={data.get('neighborhood')}"
    assert data.get("property_type") == "Villa", f"property_type={data.get('property_type')}"
    assert "Engel" in (data.get("listing_source") or ""), f"listing_source={data.get('listing_source')}"

    # price_per_sqm_eur computed
    assert data.get("price_per_sqm_eur") is not None

    # Confidence map shape
    conf = data.get("_confidence") or {}
    missing = REQUIRED_CONF_KEYS - set(conf.keys())
    assert not missing, f"missing confidence keys: {missing}"
    for k, v in conf.items():
        assert v in ALLOWED_CONF_VALUES, f"bad conf value for {k}: {v}"


@pytest.mark.timeout(45)
def test_ingest_invalid_domain_graceful(session):
    """Non-existent domain should not 500 — should return null fields with missing confidence."""
    r = session.post(f"{BASE_URL}/api/invest/ingest", json={"url": INVALID_URL}, timeout=30)
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    data = r.json()
    conf = data.get("_confidence") or {}
    # url + listing_source are derived from input — should be verified
    assert conf.get("url") == "verified"
    assert conf.get("listing_source") == "verified"
    # Critical fields should be missing
    assert conf.get("asking_price_eur") == "missing"
    assert conf.get("m2") == "missing"


@pytest.mark.timeout(45)
def test_ingest_airbnb_partial(session):
    """Airbnb is bot-blocked — must return without exception, confidence map populated."""
    r = session.post(f"{BASE_URL}/api/invest/ingest", json={"url": AIRBNB_URL}, timeout=30)
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    data = r.json()
    conf = data.get("_confidence") or {}
    missing = REQUIRED_CONF_KEYS - set(conf.keys())
    assert not missing, f"missing conf keys: {missing}"


def test_ingest_empty_url_400(session):
    r = session.post(f"{BASE_URL}/api/invest/ingest", json={"url": ""}, timeout=10)
    assert r.status_code == 400, f"got {r.status_code}: {r.text[:200]}"


def test_ingest_non_http_400(session):
    r = session.post(f"{BASE_URL}/api/invest/ingest", json={"url": "ftp://foo.bar/baz"}, timeout=30)
    assert r.status_code == 400, f"got {r.status_code}: {r.text[:200]}"


# ---------- Drafts persistence ----------

@pytest.mark.timeout(60)
def test_draft_create_get_update_user_verified(session):
    # Use minimal payload
    payload = {
        "url": EV_URL,
        "asking_price_eur": 1180000,
        "m2": 406,
        "city": "Athens",
        "neighborhood": "Adames",
        "rooms": 4,
        "bathrooms": 3,
        "year_built": 2005,
        "renovation_state": "refresh",
        "property_type": "Villa",
        "listing_source": "Engel & Völkers",
        "_confidence": {
            "asking_price_eur": "verified", "m2": "verified", "city": "verified",
            "neighborhood": "verified", "rooms": "verified", "bathrooms": "verified",
            "year_built": "verified", "renovation_state": "verified",
            "property_type": "verified", "listing_source": "verified",
            "url": "verified", "floor": "missing", "energy_class": "missing",
            "parking": "missing", "description": "missing",
            "price_per_sqm_eur": "verified",
        },
    }
    r = session.post(f"{BASE_URL}/api/invest/draft", json=payload, timeout=20)
    assert r.status_code in (200, 201), f"draft create {r.status_code}: {r.text[:300]}"
    body = r.json()
    draft_id = body.get("draft_id") or body.get("id")
    assert draft_id, f"no draft_id in {body}"

    # GET
    r = session.get(f"{BASE_URL}/api/invest/draft/{draft_id}", timeout=15)
    assert r.status_code == 200, f"draft get {r.status_code}: {r.text[:300]}"
    got = r.json()
    assert got.get("asking_price_eur") == 1180000

    # PUT — user supplies floor → confidence['floor'] = 'user_verified'
    upd = {"floor": 2, "energy_class": "C"}
    r = session.put(f"{BASE_URL}/api/invest/draft/{draft_id}", json=upd, timeout=15)
    assert r.status_code == 200, f"draft put {r.status_code}: {r.text[:300]}"
    after = r.json()
    conf = after.get("_confidence") or {}
    assert conf.get("floor") == "user_verified", f"floor conf={conf.get('floor')}"
    assert conf.get("energy_class") == "user_verified", f"ec conf={conf.get('energy_class')}"
    assert after.get("floor") == 2
    assert after.get("energy_class") == "C"


# ---------- Regression: existing endpoints still work ----------

def test_properties_demo(session):
    r = session.get(f"{BASE_URL}/api/properties/demo", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), (list, dict))


def test_upgrade_cart(session):
    r = session.post(f"{BASE_URL}/api/upgrade/cart", json={"items": []}, timeout=15)
    # Permitted: 200 / 400 (validation), but never 500
    assert r.status_code < 500, f"cart {r.status_code}"


def test_payments_checkout_smoke(session):
    # Just smoke — endpoint should respond
    r = session.post(f"{BASE_URL}/api/payments/checkout", json={"plan": "starter"}, timeout=15)
    assert r.status_code < 500, f"checkout {r.status_code}: {r.text[:200]}"


def test_invest_analyze_smoke(session):
    r = session.post(
        f"{BASE_URL}/api/invest/analyze",
        json={"url": EV_URL, "asking_price_eur": 1180000, "m2": 406, "city": "Athens"},
        timeout=45,
    )
    assert r.status_code < 500, f"analyze {r.status_code}: {r.text[:200]}"
