"""Propul8 Iter30 — Server-side draft + listing sync tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ── /api/invest/draft ──────────────────────────────────────────────
class TestInvestDraft:
    def test_create_returns_draft_id(self, s):
        r = s.post(f"{BASE_URL}/api/invest/draft", json={"city": "Athens", "asking_price_eur": 149000}, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["draft_id"].startswith("dft_")
        assert len(body["draft_id"]) >= 14
        assert body["city"] == "Athens"
        assert body["asking_price_eur"] == 149000
        assert "created_at" in body

    def test_get_returns_persisted_draft(self, s):
        created = s.post(f"{BASE_URL}/api/invest/draft", json={
            "city": "Paros", "asking_price_eur": 480000, "property_type": "Villa", "m2": 145,
        }, timeout=10).json()
        draft_id = created["draft_id"]

        got = s.get(f"{BASE_URL}/api/invest/draft/{draft_id}", timeout=10)
        assert got.status_code == 200
        body = got.json()
        assert body["draft_id"] == draft_id
        assert body["city"] == "Paros"
        assert body["asking_price_eur"] == 480000
        assert body["property_type"] == "Villa"
        assert body["m2"] == 145

    def test_get_unknown_returns_404(self, s):
        r = s.get(f"{BASE_URL}/api/invest/draft/dft_doesnotexist123", timeout=10)
        assert r.status_code == 404


# ── /api/sync/listing ──────────────────────────────────────────────
class TestSyncListing:
    def test_create_rejects_empty(self, s):
        r = s.post(f"{BASE_URL}/api/sync/listing", json={"listing_title": "", "listing_description": ""}, timeout=10)
        assert r.status_code == 400

    def test_create_returns_queued(self, s):
        r = s.post(f"{BASE_URL}/api/sync/listing", json={
            "property_id": "test-prop-1",
            "target_platform": "airbnb",
            "listing_title": "Athens Boutique 1-bed",
            "listing_description": "Editorial loft in Koukaki ...",
        }, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["job_id"].startswith("sync_")
        assert body["status"] == "queued"
        assert body["target_platform"] == "airbnb"
        assert body["timeline"][0]["step"] == "queued"
        return body

    def test_progresses_through_stages(self, s):
        job = s.post(f"{BASE_URL}/api/sync/listing", json={
            "property_id": "test-prop-2",
            "listing_title": "Test sync progression",
            "listing_description": "Some description",
        }, timeout=10).json()
        job_id = job["job_id"]

        # Immediate fetch — should still be queued.
        r1 = s.get(f"{BASE_URL}/api/sync/listing/{job_id}", timeout=10).json()
        assert r1["status"] == "queued"
        assert len(r1["timeline"]) == 1

        # Wait > 4s → submitted.
        time.sleep(5)
        r2 = s.get(f"{BASE_URL}/api/sync/listing/{job_id}", timeout=10).json()
        assert r2["status"] == "submitted"
        assert any(t["step"] == "submitted" for t in r2["timeline"])

        # Wait > 10s total → confirmed.
        time.sleep(6)
        r3 = s.get(f"{BASE_URL}/api/sync/listing/{job_id}", timeout=10).json()
        assert r3["status"] == "confirmed"
        steps = [t["step"] for t in r3["timeline"]]
        assert steps == ["queued", "submitted", "confirmed"]

    def test_history_returns_recent_jobs(self, s):
        # Create a couple jobs for a fresh property_id, then list history.
        prop_id = f"test-history-{int(time.time())}"
        for i in range(3):
            s.post(f"{BASE_URL}/api/sync/listing", json={
                "property_id":       prop_id,
                "listing_title":     f"Listing {i}",
                "listing_description": f"Description {i}",
            }, timeout=10)

        r = s.get(f"{BASE_URL}/api/sync/listings?property_id={prop_id}&limit=5", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert len(body["jobs"]) == 3
        # Most recent first.
        for j in body["jobs"]:
            assert j["property_id"] == prop_id

    def test_status_unknown_returns_404(self, s):
        r = s.get(f"{BASE_URL}/api/sync/listing/sync_doesnotexist123", timeout=10)
        assert r.status_code == 404
