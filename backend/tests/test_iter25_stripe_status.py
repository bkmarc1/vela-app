"""Iter25 — Stripe status endpoint Mongo-backed read + webhook + warmup regression."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
ORIGIN = "https://hospitality-ai-12.preview.emergentagent.com"


# ---------------------------------------------------------------------------
# Stripe checkout suite
# ---------------------------------------------------------------------------
class TestStripeCheckout:
    @pytest.mark.parametrize("tier", ["pro", "investor", "developer"])
    def test_checkout_creates_session(self, api, tier):
        r = api.post(f"{BASE_URL}/api/payments/checkout",
                     json={"tier": tier, "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert d["session_id"].startswith("cs_test_")
        assert "checkout.stripe.com" in d["url"]

    def test_free_tier_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/payments/checkout",
                     json={"tier": "free", "origin_url": ORIGIN}, timeout=10)
        assert r.status_code == 400

    def test_bad_tier_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/payments/checkout",
                     json={"tier": "platinum_unicorn", "origin_url": ORIGIN}, timeout=10)
        assert r.status_code == 400

    def test_missing_origin_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/payments/checkout",
                     json={"tier": "pro", "origin_url": ""}, timeout=10)
        assert r.status_code == 400

    def test_invalid_origin_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/payments/checkout",
                     json={"tier": "pro", "origin_url": "not-a-url"}, timeout=10)
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Stripe status — Mongo-backed
# ---------------------------------------------------------------------------
class TestStripeStatusPoll:
    @pytest.fixture(scope="class")
    def fresh_session(self):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"tier": "pro", "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["session_id"]

    def test_status_returns_persisted_record(self, api, fresh_session):
        r = api.get(f"{BASE_URL}/api/payments/status/{fresh_session}", timeout=15)
        assert r.status_code == 200, f"Expected 200 not 502/500. Got {r.status_code}: {r.text}"
        d = r.json()
        assert d["status"] == "pending"
        assert d["payment_status"] == "initiated"
        assert d["amount_total"] == 49.0
        assert d["currency"] == "eur"
        assert d["tier"] == "pro"

    def test_status_unknown_session_returns_404(self, api):
        r = api.get(f"{BASE_URL}/api/payments/status/cs_test_DEFINITELYFAKE", timeout=15)
        assert r.status_code == 404
        assert "unknown" in r.text.lower() or "not found" in r.text.lower()

    def test_status_idempotent_3x(self, api, fresh_session):
        bodies = []
        for _ in range(3):
            r = api.get(f"{BASE_URL}/api/payments/status/{fresh_session}", timeout=15)
            assert r.status_code == 200
            bodies.append(r.json())
        assert bodies[0] == bodies[1] == bodies[2]


# ---------------------------------------------------------------------------
# Webhook handler
# ---------------------------------------------------------------------------
class TestStripeWebhook:
    def test_webhook_no_sig_returns_ok_false_not_500(self, api):
        r = api.post(f"{BASE_URL}/api/webhook/stripe",
                     data=b'{"type":"checkout.session.completed","id":"evt_test"}',
                     headers={"Content-Type": "application/json"},
                     timeout=15)
        # Must NOT 500.
        assert r.status_code in (200, 400), f"Webhook 5xx — got {r.status_code}: {r.text}"
        if r.status_code == 200:
            d = r.json()
            assert d.get("ok") is False


# ---------------------------------------------------------------------------
# Vision warmup
# ---------------------------------------------------------------------------
class TestVisionWarmup:
    @pytest.mark.parametrize("i", range(3))
    def test_warmup_consistent(self, api, i):
        r = api.post(f"{BASE_URL}/api/visual-analysis/warmup", timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True
