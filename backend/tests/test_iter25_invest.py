"""Propul8 Iter25 — INVEST module backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- /api/invest/ingest ---------------------------------------------------
class TestInvestIngest:
    def test_invalid_url_rejected(self, s):
        r = s.post(f"{BASE_URL}/api/invest/ingest", json={"url": "not-a-url"}, timeout=15)
        assert r.status_code == 400

    def test_user_overrides_win(self, s):
        r = s.post(
            f"{BASE_URL}/api/invest/ingest",
            json={
                "url": "https://www.spitogatos.gr/en/for-sale-home/koukaki-athens",
                "asking_price_eur": 149000,
                "m2": 75,
                "city": "Athens",
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["asking_price_eur"] == 149000
        assert body["m2"] == 75
        assert body["city"] == "Athens"
        # iter32 — `_confidence` replaces `_provenance`. User-supplied fields
        # are marked user_verified.
        assert body["_confidence"]["asking_price_eur"] == "user_verified"
        assert body["_confidence"]["m2"] == "user_verified"

    def test_property_type_heuristic(self, s):
        r = s.post(
            f"{BASE_URL}/api/invest/ingest",
            json={"url": "https://example.com/villa-paros-greece", "asking_price_eur": 480000, "city": "Paros"},
            timeout=20,
        )
        assert r.status_code == 200
        # Slug 'villa' should be picked up
        assert r.json()["property_type"] == "Villa"


# ---- /api/invest/analyze --------------------------------------------------
class TestInvestAnalyze:
    @pytest.fixture(scope="class")
    def baseline(self, s=None):
        sess = requests.Session()
        sess.headers.update({"Content-Type": "application/json"})
        r = sess.post(
            f"{BASE_URL}/api/invest/analyze",
            json={
                "asset_id": "test-baseline",
                "city": "Athens",
                "property_type": "Apartment",
                "asking_price_eur": 149000,
                "m2": 75,
                "rooms": 2,
                "renovation_state": "refresh",
                "elevator": False,
                "year_built": 1976,
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_required_fields_rejected(self):
        r = requests.post(
            f"{BASE_URL}/api/invest/analyze",
            json={"city": "Athens"},
            timeout=15,
        )
        assert r.status_code in (400, 422)

    def test_top_level_shape(self, baseline):
        for key in (
            "asset_id", "input", "snapshot", "offer_intelligence",
            "true_roi", "transformation", "negotiation", "market_signals",
            "str_comps", "max_buy_price", "analysis_version", "generated_at",
        ):
            assert key in baseline, f"Missing top-level key: {key}"

    def test_snapshot_keys(self, baseline):
        snap = baseline["snapshot"]
        for k in (
            "str_score", "appreciation_potential", "occupancy_strength",
            "pricing_power", "design_upside", "liquidity_score",
            "seasonality_risk", "estimated_net_yield_pct", "cash_on_cash_pct",
        ):
            assert k in snap
            assert isinstance(snap[k], (int, float))

    def test_offer_strategies_count(self, baseline):
        strategies = baseline["offer_intelligence"]["strategies"]
        assert len(strategies) == 4
        labels = [s["label"] for s in strategies]
        assert labels == ["Aggressive Buy", "Smart Buy", "Market Fair", "Overpriced"]
        # Aggressive Buy should yield more than Overpriced
        assert strategies[0]["net_yield_pct"] > strategies[3]["net_yield_pct"]

    def test_true_roi_balances(self, baseline):
        roi = baseline["true_roi"]
        gross = roi["gross_revenue_eur"]
        total_exp = roi["total_expenses_eur"]
        net = roi["net_cashflow_eur"]
        # net = gross - total_expenses (allow ±2 €rounding)
        assert abs(net - (gross - total_exp)) <= 2

    def test_transformation_three_scenarios(self, baseline):
        sc = baseline["transformation"]["scenarios"]
        assert len(sc) == 3
        # Net yield must be monotonically non-decreasing
        for i in range(1, len(sc)):
            assert sc[i]["net_yield_pct"] >= sc[i - 1]["net_yield_pct"]

    def test_max_buy_price_inverse(self, baseline):
        mb = baseline["max_buy_price"]
        assert len(mb) >= 3
        # Higher target yield → lower max price (strict monotonic)
        for i in range(1, len(mb)):
            assert mb[i - 1]["target_yield_pct"] > mb[i]["target_yield_pct"]
            assert mb[i - 1]["max_price_eur"]    < mb[i]["max_price_eur"]

    def test_str_comps_shape(self, baseline):
        comps = baseline["str_comps"]["comps"]
        assert 3 <= len(comps) <= 8
        for c in comps:
            assert "name" in c and "occupancy_pct" in c and "adr_eur" in c

    def test_determinism(self, s):
        """Same input → same output every call."""
        body = {
            "asset_id": "det-check",
            "city": "Mykonos",
            "property_type": "Villa",
            "asking_price_eur": 850000,
            "m2": 180,
            "rooms": 4,
            "renovation_state": "renovation",
            "elevator": True,
            "year_built": 2010,
        }
        r1 = s.post(f"{BASE_URL}/api/invest/analyze", json=body, timeout=20).json()
        r2 = s.post(f"{BASE_URL}/api/invest/analyze", json=body, timeout=20).json()
        # generated_at differs by design; everything else must match.
        for k in ("snapshot", "offer_intelligence", "true_roi", "transformation", "negotiation", "market_signals", "str_comps", "max_buy_price"):
            assert r1[k] == r2[k], f"Determinism violated on key: {k}"
