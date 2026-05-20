"""Iter63 — Pricing tier checkout regression.

Validates new tier IDs (start, analyze, pro, scale) plus legacy aliases
(free, investor, developer) against POST /api/payments/checkout.
Also validates PRICING_TIERS table values from importable module.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # backend tests sometimes run before env is exported — fall back to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = (BASE_URL or "").rstrip("/")

ORIGIN = "https://example.propul8.app"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- PRICING_TIERS direct dict check (backend import) ----------
def test_pricing_tiers_values_in_server_module():
    import sys
    sys.path.insert(0, "/app/backend")
    from server import PRICING_TIERS
    assert PRICING_TIERS["start"]["amount"] == 0.0
    assert PRICING_TIERS["analyze"]["amount"] == 49.0
    assert PRICING_TIERS["pro"]["amount"] == 149.0
    assert PRICING_TIERS["scale"]["amount"] == 0.0
    for k in ("start", "analyze", "pro", "scale"):
        assert PRICING_TIERS[k]["currency"] == "eur"
    # legacy aliases preserved
    for k in ("free", "investor", "developer"):
        assert k in PRICING_TIERS


# ---------- new tier IDs ----------
@pytest.mark.parametrize("tier", ["analyze", "pro"])
def test_checkout_new_paid_tiers(s, tier):
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": tier, "origin_url": ORIGIN})
    assert r.status_code == 200, f"{tier} -> {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "url" in data and data["url"].startswith("http")
    assert "session_id" in data and isinstance(data["session_id"], str) and data["session_id"]


def test_checkout_start_is_free_tier_400(s):
    # 'start' has amount 0 → backend rejects (frontend handles redirect to /invest)
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "start", "origin_url": ORIGIN})
    assert r.status_code == 400
    assert "free" in r.text.lower()


def test_checkout_scale_is_custom_tier_400(s):
    # 'scale' has amount 0 → backend rejects (frontend handles via mailto)
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "scale", "origin_url": ORIGIN})
    assert r.status_code == 400


# ---------- legacy aliases ----------
def test_checkout_legacy_investor_alias(s):
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "investor", "origin_url": ORIGIN})
    assert r.status_code == 200, r.text[:200]
    j = r.json()
    assert j.get("url", "").startswith("http")
    assert j.get("session_id")


def test_checkout_legacy_free_alias_400(s):
    # 'free' aliases 'start' — amount 0 → 400
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "free", "origin_url": ORIGIN})
    assert r.status_code == 400


def test_checkout_legacy_developer_alias_400(s):
    # 'developer' aliases 'scale' — amount 0 → 400
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "developer", "origin_url": ORIGIN})
    assert r.status_code == 400


def test_checkout_unknown_tier_400(s):
    r = s.post(f"{BASE_URL}/api/payments/checkout", json={"tier": "bogus", "origin_url": ORIGIN})
    assert r.status_code == 400


# ---------- regression: news + competition + sources + location ----------
def test_dashboard_news_strict_filter(s):
    r = s.get(f"{BASE_URL}/api/dashboard/news?limit=12")
    assert r.status_code == 200
    items = r.json().get("items", []) or r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    # accept either {items:[]} or [...]
    if isinstance(r.json(), dict) and "items" in r.json():
        items = r.json()["items"]
    elif isinstance(r.json(), list):
        items = r.json()
    banned = ("suicide", "murder", "election", "celebrity", "sport")
    for it in items:
        text = (str(it.get("title", "")) + " " + str(it.get("summary", ""))).lower()
        for b in banned:
            assert b not in text, f"banned keyword '{b}' in {text[:80]}"


def test_dashboard_competition(s):
    r = s.get(f"{BASE_URL}/api/dashboard/competition")
    assert r.status_code == 200


def test_location_analyze_minimal(s):
    r = s.post(f"{BASE_URL}/api/location/analyze", json={"address": "Glyfada, Athens"})
    # Accept 200 or 422 (validation); just verify endpoint not 500
    assert r.status_code != 500, r.text[:200]
