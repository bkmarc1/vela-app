"""Propul8 Iter24 — Stripe checkout, status poll, vision warmup tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
ORIGIN   = "https://hospitality-ai-12.preview.emergentagent.com"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- Vision warmup ---------------------------------------------------------
class TestVisionWarmup:
    def test_warmup_ok(self, s):
        r = s.post(f"{BASE_URL}/api/visual-analysis/warmup", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True, body

    def test_warmup_idempotent(self, s):
        for _ in range(3):
            r = s.post(f"{BASE_URL}/api/visual-analysis/warmup", timeout=30)
            assert r.status_code == 200
            assert r.json().get("ok") is True


# ---- Stripe negative cases -------------------------------------------------
class TestStripeValidation:
    def test_free_tier_rejected(self, s):
        r = s.post(f"{BASE_URL}/api/payments/checkout",
                   json={"tier": "free", "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 400
        assert "free tier" in r.text.lower()

    def test_unknown_tier_rejected(self, s):
        r = s.post(f"{BASE_URL}/api/payments/checkout",
                   json={"tier": "enterprise", "origin_url": ORIGIN}, timeout=30)
        assert r.status_code == 400
        assert "unknown" in r.text.lower()

    def test_bad_origin_url(self, s):
        r = s.post(f"{BASE_URL}/api/payments/checkout",
                   json={"tier": "pro", "origin_url": ""}, timeout=30)
        assert r.status_code == 400
        assert "origin" in r.text.lower()


# ---- Stripe positive cases -------------------------------------------------
@pytest.mark.parametrize("tier", ["pro", "investor", "developer"])
def test_checkout_creates_session(s, tier):
    r = s.post(f"{BASE_URL}/api/payments/checkout",
               json={"tier": tier, "origin_url": ORIGIN}, timeout=60)
    assert r.status_code == 200, f"{tier}: {r.status_code} {r.text}"
    body = r.json()
    assert "url" in body and "session_id" in body, body
    assert body["url"].startswith("https://checkout.stripe.com"), body["url"]
    assert body["session_id"].startswith("cs_test_"), body["session_id"]


# ---- Stripe status poll ----------------------------------------------------
class TestStripeStatusPoll:
    @pytest.fixture(scope="class")
    def fresh_session(self):
        sess = requests.Session()
        sess.headers.update({"Content-Type": "application/json"})
        r = sess.post(f"{BASE_URL}/api/payments/checkout",
                      json={"tier": "pro", "origin_url": ORIGIN}, timeout=60)
        assert r.status_code == 200, r.text
        return r.json()["session_id"]

    def test_status_returns_open_or_unpaid(self, s, fresh_session):
        r = s.get(f"{BASE_URL}/api/payments/status/{fresh_session}", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "status" in body
        assert "payment_status" in body
        assert "amount_total" in body
        assert "currency" in body
        assert "tier" in body
        # Pre-payment, Mongo-source-of-truth returns 'pending' + 'initiated'.
        # (The endpoint reads from payment_transactions, populated by /webhook/stripe.)
        # Stripe's own 'open'/'unpaid' lifecycle is also valid if a future change
        # routes to the Stripe API directly.
        assert body["status"] in ("pending", "open", "complete"), body
        assert body["payment_status"] in ("initiated", "unpaid", "paid"), body

    def test_status_idempotent(self, s, fresh_session):
        # Multiple polls should not error and should return consistent shape
        results = []
        for _ in range(3):
            r = s.get(f"{BASE_URL}/api/payments/status/{fresh_session}", timeout=30)
            assert r.status_code == 200
            results.append(r.json())
        # all should report the same currency + tier
        currencies = {x.get("currency") for x in results}
        tiers      = {x.get("tier") for x in results}
        assert len(currencies) == 1
        assert len(tiers) == 1
