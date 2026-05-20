"""Iter66 backend regression — verify router refactor didn't break any endpoint.

server.py was split into routers/auth.py, routers/checkout.py, routers/invest.py,
routers/operate.py. Lazy forwarders break circular imports. This file hits every
endpoint the iter66 review enumerates.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    'REACT_APP_BACKEND_URL',
    'https://hospitality-ai-12.preview.emergentagent.com',
).rstrip('/')


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ── ROOT / HEALTH ──────────────────────────────────────────────────
def test_root(s):
    r = s.get(f"{BASE_URL}/", timeout=20)
    # Root should serve frontend or some 200/redirect — must not 5xx
    assert r.status_code < 500, r.text[:200]


def test_api_root(s):
    r = s.get(f"{BASE_URL}/api/", timeout=20)
    assert r.status_code in (200, 404), r.text[:200]


# ── AUTH ROUTER (routers/auth.py) ──────────────────────────────────
def test_auth_me_unauthenticated(s):
    r = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert r.status_code == 401, r.text[:200]


def test_auth_logout_no_cookie(s):
    r = s.post(f"{BASE_URL}/api/auth/logout", timeout=20)
    assert r.status_code == 200, r.text[:200]


def test_auth_session_missing_id(s):
    # Verify session endpoint reachable; empty payload should hit 400
    r = s.post(f"{BASE_URL}/api/auth/session", json={}, timeout=20)
    assert r.status_code in (400, 422), r.text[:200]


# ── PROPERTIES / PORTFOLIO (still in server.py) ────────────────────
def test_properties_demo(s):
    r = s.get(f"{BASE_URL}/api/properties/demo", timeout=30)
    assert r.status_code == 200, r.text[:200]


def test_portfolio_demo(s):
    r = s.get(f"{BASE_URL}/api/portfolio/demo", timeout=30)
    assert r.status_code == 200, r.text[:200]


# ── DASHBOARD ROUTER ───────────────────────────────────────────────
def test_dashboard_news(s):
    r = s.get(f"{BASE_URL}/api/dashboard/news?limit=10", timeout=30)
    assert r.status_code == 200, r.text[:200]
    body = r.json()
    assert "items" in body
    assert isinstance(body["items"], list)


def test_dashboard_competition(s):
    r = s.get(f"{BASE_URL}/api/dashboard/competition", timeout=30)
    assert r.status_code == 200, r.text[:200]


# ── CHECKOUT ROUTER (routers/checkout.py) ──────────────────────────
def test_checkout_pro(s):
    r = s.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"tier": "pro", "origin_url": "https://example.com"},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert "url" in body
    assert "session_id" in body


def test_checkout_start_free_tier_rejected(s):
    r = s.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"tier": "start", "origin_url": "https://example.com"},
        timeout=90,
    )
    assert r.status_code == 400, r.text[:300]
    body = r.json()
    blob = str(body).lower()
    assert "free" in blob or "no checkout" in blob, body


# ── INVEST ROUTER (routers/invest.py) ──────────────────────────────
def test_invest_analyze_minimal(s):
    # Minimal required by InvestAnalyzeRequest schema
    payload = {
        "city": "Athens",
        "property_type": "Apartment",
        "asking_price_eur": 250000,
        "m2": 65,
        "rooms": 2,
        "renovation_state": "refresh",
    }
    r = s.post(f"{BASE_URL}/api/invest/analyze", json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]


def test_invest_draft_create_and_get(s):
    payload = {"city": "Athens", "country": "Greece", "title": "TEST_iter66 draft"}
    r = s.post(f"{BASE_URL}/api/invest/draft", json=payload, timeout=30)
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    draft_id = body.get("id") or body.get("draft_id") or body.get("_id")
    assert draft_id, f"no id in {body}"
    g = s.get(f"{BASE_URL}/api/invest/draft/{draft_id}", timeout=30)
    assert g.status_code == 200, g.text[:300]


# ── OPERATE ROUTER (routers/operate.py) ────────────────────────────
def test_visual_analysis_warmup(s):
    r = s.post(f"{BASE_URL}/api/visual-analysis/warmup", json={}, timeout=30)
    assert r.status_code == 200, r.text[:300]


def test_transform_bad_payload_no_500(s):
    r = s.post(f"{BASE_URL}/api/transform", json={}, timeout=30)
    # Validation hit is fine, server crash is not
    assert r.status_code != 500, r.text[:300]
    assert r.status_code in (200, 400, 422), r.text[:300]


def test_ingest_listing_url_no_500(s):
    r = s.post(
        f"{BASE_URL}/api/ingest/listing-url",
        json={"url": "https://example.invalid/not-a-real-listing"},
        timeout=60,
    )
    assert r.status_code != 500, r.text[:300]
    assert r.status_code in (200, 400, 404, 422), r.text[:300]


def test_sync_listing_minimal(s):
    payload = {
        "property_id": "TEST_iter66_prop",
        "target_platform": "all",
        "listing_title": "TEST_iter66 listing title",
        "listing_description": "TEST_iter66 listing description body copy.",
        "nightly_rate_eur": 180,
        "minimum_stay": 2,
    }
    r = s.post(f"{BASE_URL}/api/sync/listing", json=payload, timeout=30)
    assert r.status_code == 200, r.text[:300]


def test_sync_listings_list(s):
    r = s.get(f"{BASE_URL}/api/sync/listings", timeout=30)
    assert r.status_code == 200, r.text[:300]
