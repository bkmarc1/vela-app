"""Iter67 Portfolio Intelligence backend tests.

Covers:
- Regression on previously-shipped endpoints
- New /api/portfolio-intel/* endpoints (Claude Sonnet 4.5 + deterministic fallbacks)
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

CLAUDE_TIMEOUT = 60  # Claude calls can take 5-15s

# -----------------------------------------------------------------------
# Regression (iter66 + earlier)
# -----------------------------------------------------------------------

class TestRegression:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200

    def test_auth_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_properties_demo(self):
        r = requests.get(f"{API}/properties/demo", timeout=20)
        assert r.status_code == 200

    def test_portfolio_demo(self):
        r = requests.get(f"{API}/portfolio/demo", timeout=20)
        assert r.status_code == 200

    def test_dashboard_news(self):
        r = requests.get(f"{API}/dashboard/news", timeout=30)
        assert r.status_code == 200

    def test_payments_checkout_pro(self):
        r = requests.post(f"{API}/payments/checkout",
                          json={"tier": "pro", "origin_url": "https://example.com"},
                          timeout=90)
        assert r.status_code == 200, r.text[:200]

    def test_invest_analyze(self):
        payload = {
            "city": "Athens",
            "property_type": "Apartment",
            "asking_price_eur": 250000,
            "m2": 65,
            "rooms": 2,
            "renovation_state": "refresh",
        }
        r = requests.post(f"{API}/invest/analyze", json=payload, timeout=120)
        assert r.status_code == 200, r.text[:300]

    def test_visual_warmup(self):
        r = requests.post(f"{API}/visual-analysis/warmup", json={}, timeout=30)
        assert r.status_code == 200

    def test_transform_no_500(self):
        # Bad payload should NOT be 500
        r = requests.post(f"{API}/transform", json={}, timeout=30)
        assert r.status_code in (200, 400, 422)
        assert r.status_code != 500

    def test_sync_listing(self):
        payload = {
            "property_id": "TEST_iter67_prop",
            "target_platform": "all",
            "listing_title": "TEST_iter67 listing title",
            "listing_description": "TEST_iter67 listing description body.",
            "nightly_rate_eur": 180,
            "minimum_stay": 2,
        }
        r = requests.post(f"{API}/sync/listing", json=payload, timeout=30)
        assert r.status_code == 200, r.text[:300]

    def test_sync_listings_get(self):
        r = requests.get(f"{API}/sync/listings", timeout=20)
        assert r.status_code == 200


# -----------------------------------------------------------------------
# New Portfolio Intelligence endpoints
# -----------------------------------------------------------------------

SYNTHETIC_ASSET = {
    "id": "owned-koukaki-str",
    "title": "Koukaki STR Apartment",
    "city": "Athens",
    "neighborhood": "Koukaki",
    "property_type": "Apartment",
    "sqm": 65,
    "condition": "Renovated",
    "purchase_price_eur": 195000,
    "purchase_date": "2023-04-15",
    "current_value_eur": 225000,
    "valuation_source": "manual",
    "annual_gross_eur": 18500,
    "annual_net_eur": 13200,
    "occupancy_pct": 78,
    "adr_eur": 95,
    "mortgage_balance_eur": 110000,
    "management_fee_pct": 18,
    "management_company": "Athens STR Co",
}


class TestPortfolioIntel:
    created_asset_id = None

    def test_create_asset(self):
        payload = {
            "title": "TEST_iter67 Athens Asset",
            "city": "Athens",
            "neighborhood": "Koukaki",
            "property_type": "Apartment",
            "sqm": 60,
            "condition": "Good",
            "purchase_price_eur": 200000,
            "purchase_date": "2024-01-01",
            "current_value_eur": 215000,
            "valuation_source": "manual",
            "annual_gross_eur": 15000,
            "annual_net_eur": 10500,
            "occupancy_pct": 70,
            "adr_eur": 90,
            "mortgage_balance_eur": 80000,
            "management_fee_pct": 18,
            "management_company": "Test Mgmt",
        }
        r = requests.post(f"{API}/portfolio-intel/asset", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        assert data["title"] == payload["title"]
        assert data["city"] == payload["city"]
        assert data["purchase_price_eur"] == payload["purchase_price_eur"]
        assert "_id" not in data  # Mongo ObjectId must be stripped
        TestPortfolioIntel.created_asset_id = data["id"]

    def test_list_owned(self):
        r = requests.get(f"{API}/portfolio-intel/owned", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "assets" in data
        assert isinstance(data["assets"], list)
        # The asset we created should be there
        if TestPortfolioIntel.created_asset_id:
            ids = [a.get("id") for a in data["assets"]]
            assert TestPortfolioIntel.created_asset_id in ids

    def test_update_valuation_created_asset(self):
        if not TestPortfolioIntel.created_asset_id:
            pytest.skip("No created asset id")
        r = requests.put(
            f"{API}/portfolio-intel/asset/{TestPortfolioIntel.created_asset_id}/valuation",
            json={"current_value_eur": 230000, "valuation_source": "manual"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["current_value_eur"] == 230000
        assert data["valuation_source"] == "manual"
        assert "valuation_updated_at" in data

    def test_update_valuation_demo_asset(self):
        # Demo asset id may not exist in DB — should still return 200 w/ override flag
        r = requests.put(
            f"{API}/portfolio-intel/asset/owned-koukaki-str/valuation",
            json={"current_value_eur": 230000, "valuation_source": "manual"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["current_value_eur"] == 230000

    def test_update_valuation_invalid(self):
        r = requests.put(
            f"{API}/portfolio-intel/asset/whatever/valuation",
            json={"current_value_eur": 0},
            timeout=20,
        )
        assert r.status_code == 400

    def test_signal(self):
        r = requests.post(f"{API}/portfolio-intel/signal",
                          json={"asset": SYNTHETIC_ASSET},
                          timeout=CLAUDE_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "signal" in data
        signal = data["signal"]
        assert isinstance(signal, str)
        assert len(signal) > 0
        # Should contain at least one action verb
        action_verbs = ["Hold", "Sell", "Refinance", "Renovate", "Optimize", "Watch"]
        assert any(v in signal for v in action_verbs), f"No action verb in: {signal}"

    def test_portfolio_signal(self):
        summary = {
            "asset_count": 3,
            "purchase_total": 650000,
            "current_total": 730000,
            "equity_total": 280000,
            "equity_pct": 12.3,
            "annual_net": 38000,
            "yield_on_cost_pct": 5.8,
            "yield_on_now_pct": 5.2,
            "portfolio_score": 78,
            "portfolio_liquidity": "Medium",
        }
        r = requests.post(f"{API}/portfolio-intel/portfolio-signal",
                          json={"summary": summary, "top_asset_name": "Koukaki STR"},
                          timeout=CLAUDE_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "signal" in data
        assert isinstance(data["signal"], str)
        assert len(data["signal"]) > 0

    def test_exit_plan(self):
        r = requests.post(f"{API}/portfolio-intel/exit-plan",
                          json={"asset": SYNTHETIC_ASSET, "target_timeline_days": 90},
                          timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "plan" in data
        plan = data["plan"]
        for key in [
            "recommended_listing_price_eur",
            "realistic_offer_low_eur",
            "realistic_offer_high_eur",
            "target_buyer_profile",
            "documents_to_prepare",
            "design_improvements",
            "income_proof",
            "best_selling_angle",
            "furnished_recommendation",
            "expected_timeline_days",
            "final_recommendation",
        ]:
            assert key in plan, f"Missing key {key} in plan"
        assert isinstance(plan["documents_to_prepare"], list)
        assert isinstance(plan["design_improvements"], list)
        assert isinstance(plan["income_proof"], list)

    def test_action_plan(self):
        r = requests.post(f"{API}/portfolio-intel/action-plan",
                          json={"asset": SYNTHETIC_ASSET},
                          timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "plan" in data
        steps = data["plan"]["steps"]
        assert isinstance(steps, list)
        assert len(steps) == 5
        for s in steps:
            assert "n" in s and "title" in s and "detail" in s
