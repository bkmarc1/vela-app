"""Iter65 backend regression — palette/typography refresh shouldn't break APIs."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hospitality-ai-12.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def s():
    return requests.Session()

# ── Market Trends news endpoint ────────────────────────────────────
def test_dashboard_news_ok(s):
    r = s.get(f"{BASE_URL}/api/dashboard/news?limit=10", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)

def test_dashboard_news_filter_no_crime(s):
    r = s.get(f"{BASE_URL}/api/dashboard/news?limit=15", timeout=30)
    assert r.status_code == 200
    items = r.json().get("items", [])
    bad_keywords = ["murder", "homicide", "arrested", "stabbed", "assault"]
    for it in items:
        text = f"{it.get('title','')} {it.get('description','')}".lower()
        for kw in bad_keywords:
            assert kw not in text, f"crime keyword '{kw}' leaked: {it.get('title')}"

def test_dashboard_competition_ok(s):
    r = s.get(f"{BASE_URL}/api/dashboard/competition", timeout=30)
    assert r.status_code == 200

# ── Stripe stub checkout — tier=analyze + tier=pro ─────────────────
def test_checkout_analyze(s):
    payload = {"tier": "analyze", "origin_url": "https://example.com"}
    r = s.post(f"{BASE_URL}/api/payments/checkout", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "url" in body or "session_id" in body

def test_checkout_pro(s):
    payload = {"tier": "pro", "origin_url": "https://example.com"}
    r = s.post(f"{BASE_URL}/api/payments/checkout", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "url" in body or "session_id" in body

# ── Location analyze: should not 500 ───────────────────────────────
def test_location_analyze_no_500(s):
    payload = {"address": "Koukaki, Athens, Greece"}
    r = s.post(f"{BASE_URL}/api/location/analyze", json=payload, timeout=60)
    assert r.status_code != 500, f"unexpected 500: {r.text[:300]}"
    assert r.status_code in (200, 400, 422), f"unexpected status {r.status_code}: {r.text[:200]}"
