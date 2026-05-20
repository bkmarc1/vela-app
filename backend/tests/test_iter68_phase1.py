"""Iter68 Phase 1 backend tests.

Covers:
- NEW endpoints: POST /api/portfolio-intel/negotiation-pack, POST + GET /api/portfolio-intel/pipeline
- Regression: GET /, /api/auth/me, /api/properties/demo, /api/portfolio/demo, /api/dashboard/news,
  POST /api/payments/checkout (pro), POST /api/invest/analyze, POST /api/visual-analysis/warmup,
  POST /api/portfolio-intel/owned, POST /api/portfolio-intel/signal,
  POST /api/portfolio-intel/action-plan, POST /api/portfolio-intel/exit-plan
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── NEW endpoints (Iter68) ───────────────────────────────────────────

class TestNegotiationPack:
    def test_negotiation_pack_structure(self, client):
        payload = {
            "asset": {"title": "Test", "city": "Athens", "m2": 75},
            "verdict": {
                "target_offer_eur": 180000,
                "aggressive_offer_eur": 170000,
                "projected_post_vela_yield_pct": 6.8,
            },
            "asking_price_eur": 200000,
        }
        r = client.post(f"{BASE_URL}/api/portfolio-intel/negotiation-pack", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "pack" in data
        pack = data["pack"]
        assert isinstance(pack.get("comparable_sales"), list) and len(pack["comparable_sales"]) == 3
        assert isinstance(pack.get("yield_sensitivity"), list) and len(pack["yield_sensitivity"]) == 3
        assert isinstance(pack.get("leverage_points"), list) and len(pack["leverage_points"]) == 3
        assert pack.get("smart_buy_target_eur") == 180000
        assert pack.get("aggressive_offer_eur") == 170000
        assert pack.get("asking_price_eur") == 200000
        # each comp must have address + price
        for c in pack["comparable_sales"]:
            assert "address" in c and "price" in c
        for s in pack["yield_sensitivity"]:
            assert "scenario" in s and "yield_pct" in s


class TestPipeline:
    def test_save_to_pipeline_then_list(self, client):
        save_payload = {
            "asset": {"title": "TEST_iter68_pipeline", "city": "Athens", "neighborhood": "Plaka"},
            "verdict": {
                "verdict": "NEGOTIATE",
                "propul8_score": 72,
                "target_offer_eur": 250000,
                "aggressive_offer_eur": 235000,
                "projected_post_vela_yield_pct": 6.2,
            },
            "asking_price_eur": 280000,
            "asset_id": "test-neg-iter68",
        }
        r = client.post(f"{BASE_URL}/api/portfolio-intel/pipeline", json=save_payload, timeout=20)
        assert r.status_code == 200, r.text
        saved = r.json().get("saved")
        assert saved and saved.get("title") == "TEST_iter68_pipeline"
        assert saved.get("status") == "In Negotiation"
        assert saved.get("verdict") == "NEGOTIATE"
        assert "pipeline_id" in saved

        # GET pipeline
        g = client.get(f"{BASE_URL}/api/portfolio-intel/pipeline", timeout=15)
        assert g.status_code == 200
        items = g.json().get("items", [])
        assert any(it.get("pipeline_id") == saved["pipeline_id"] for it in items)


# ─── Regression: iter66+iter67 endpoints ──────────────────────────────

class TestRegression:
    def test_root(self, client):
        r = client.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200

    def test_auth_me_unauthenticated(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 401

    def test_properties_demo(self, client):
        r = client.get(f"{BASE_URL}/api/properties/demo", timeout=15)
        assert r.status_code == 200

    def test_portfolio_demo(self, client):
        r = client.get(f"{BASE_URL}/api/portfolio/demo", timeout=15)
        assert r.status_code == 200

    def test_dashboard_news(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard/news", timeout=20)
        assert r.status_code == 200

    def test_payments_checkout_pro(self, client):
        r = client.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"tier": "pro", "origin_url": BASE_URL},
            timeout=20,
        )
        assert r.status_code == 200, r.text

    def test_invest_analyze(self, client):
        payload = {
            "asset_id": "test-neg",
            "city": "Athens",
            "asking_price_eur": 280000,
            "property_type": "Apartment",
            "m2": 60,
            "rooms": 2,
            "condition": "good",
        }
        r = client.post(f"{BASE_URL}/api/invest/analyze", json=payload, timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        # Common keys used by frontend
        assert isinstance(body, dict)

    def test_visual_analysis_warmup(self, client):
        r = client.post(f"{BASE_URL}/api/visual-analysis/warmup", json={}, timeout=20)
        assert r.status_code == 200

    def test_portfolio_intel_owned(self, client):
        r = client.post(
            f"{BASE_URL}/api/portfolio-intel/owned",
            json={},
            timeout=15,
        )
        # Some routers expose this as GET; try GET fallback if POST not allowed
        if r.status_code == 405:
            r = client.get(f"{BASE_URL}/api/portfolio-intel/owned", timeout=15)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text}"

    def test_portfolio_intel_signal(self, client):
        payload = {
            "asset": {
                "title": "Test Apt",
                "city": "Athens",
                "purchase_price_eur": 200000,
                "current_value_eur": 240000,
                "annual_gross_eur": 18000,
                "annual_net_eur": 12000,
                "occupancy_pct": 78,
                "adr_eur": 95,
            }
        }
        r = client.post(f"{BASE_URL}/api/portfolio-intel/signal", json=payload, timeout=45)
        assert r.status_code == 200, r.text
        assert "signal" in r.json()

    def test_portfolio_intel_action_plan(self, client):
        payload = {
            "asset": {
                "title": "Test Apt",
                "city": "Athens",
                "purchase_price_eur": 200000,
                "current_value_eur": 240000,
                "annual_net_eur": 12000,
                "occupancy_pct": 78,
                "adr_eur": 95,
            }
        }
        r = client.post(f"{BASE_URL}/api/portfolio-intel/action-plan", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        plan = r.json().get("plan", {})
        steps = plan.get("steps", [])
        assert isinstance(steps, list) and len(steps) >= 5

    def test_portfolio_intel_exit_plan(self, client):
        payload = {
            "asset": {
                "title": "Test Apt",
                "city": "Athens",
                "purchase_price_eur": 200000,
                "current_value_eur": 240000,
                "annual_gross_eur": 18000,
                "annual_net_eur": 12000,
                "occupancy_pct": 78,
                "adr_eur": 95,
                "sqm": 60,
                "condition": "good",
            },
            "target_timeline_days": 90,
        }
        r = client.post(f"{BASE_URL}/api/portfolio-intel/exit-plan", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        plan = r.json().get("plan", {})
        assert "recommended_listing_price_eur" in plan
