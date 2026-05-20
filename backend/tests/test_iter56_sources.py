"""Iter 56 — Source Ledger v2 + Data Lock backend tests.

Validates the three new endpoints introduced for per-asset, per-field locks:
  GET  /api/sources/{asset_id}
  POST /api/sources/{asset_id}/lock
  POST /api/sources/{asset_id}/unlock
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ASSET_ID = "TEST_iter56_demo"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # teardown — unlock any leftover test locks
    for field in ("bedrooms", "city", "property_type", "asking_price"):
        try:
            s.post(f"{BASE_URL}/api/sources/{ASSET_ID}/unlock", json={"field": field}, timeout=5)
        except Exception:
            pass


# ---------------- GET (empty) ----------------
class TestSourcesGetEmpty:
    def test_get_returns_empty_locks_for_unknown_asset(self, api_client):
        # Ensure clean state
        api_client.post(f"{BASE_URL}/api/sources/{ASSET_ID}/unlock", json={"field": "bedrooms"}, timeout=5)
        r = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["asset_id"] == ASSET_ID
        assert isinstance(data["locks"], list)
        assert data["locks"] == []
        # _id must not leak
        assert "_id" not in data
        for lock in data["locks"]:
            assert "_id" not in lock


# ---------------- POST /lock ----------------
class TestSourcesLock:
    def test_lock_creates_doc(self, api_client):
        payload = {"field": "bedrooms", "value": 3, "locked_by": "demo"}
        r = api_client.post(f"{BASE_URL}/api/sources/{ASSET_ID}/lock", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["asset_id"] == ASSET_ID
        assert d["field"] == "bedrooms"
        assert d["value"] == 3
        assert d["locked_by"] == "demo"
        assert isinstance(d["locked_at"], str)
        assert len(d["locked_at"]) > 0
        assert "_id" not in d

    def test_get_after_lock_returns_lock(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        assert r.status_code == 200
        locks = r.json()["locks"]
        assert len(locks) == 1
        lock = locks[0]
        assert lock["field"] == "bedrooms"
        assert lock["value"] == 3
        assert "_id" not in lock

    def test_relock_is_upsert(self, api_client):
        # Re-lock same field with new value — must NOT duplicate
        payload = {"field": "bedrooms", "value": 4, "locked_by": "demo"}
        r = api_client.post(f"{BASE_URL}/api/sources/{ASSET_ID}/lock", json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["value"] == 4

        # GET must still show exactly 1 lock for that field, updated value
        g = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        locks = g.json()["locks"]
        bedrooms = [l for l in locks if l["field"] == "bedrooms"]
        assert len(bedrooms) == 1
        assert bedrooms[0]["value"] == 4

    def test_lock_multiple_fields(self, api_client):
        for field, value in (("city", "Athens"), ("property_type", "apartment")):
            r = api_client.post(
                f"{BASE_URL}/api/sources/{ASSET_ID}/lock",
                json={"field": field, "value": value, "locked_by": "demo"},
                timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["field"] == field
            assert r.json()["value"] == value

        g = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        fields = {l["field"] for l in g.json()["locks"]}
        assert {"bedrooms", "city", "property_type"}.issubset(fields)


# ---------------- POST /unlock ----------------
class TestSourcesUnlock:
    def test_unlock_returns_locked_false(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/sources/{ASSET_ID}/unlock",
            json={"field": "bedrooms"},
            timeout=10,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["asset_id"] == ASSET_ID
        assert d["field"] == "bedrooms"
        assert d["locked"] is False

    def test_get_after_unlock_omits_field(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        fields = {l["field"] for l in r.json()["locks"]}
        assert "bedrooms" not in fields

    def test_unlock_remaining_fields_returns_empty(self, api_client):
        for field in ("city", "property_type"):
            api_client.post(
                f"{BASE_URL}/api/sources/{ASSET_ID}/unlock",
                json={"field": field},
                timeout=10,
            )
        g = api_client.get(f"{BASE_URL}/api/sources/{ASSET_ID}", timeout=10)
        assert g.json()["locks"] == []

    def test_unlock_nonexistent_field_is_idempotent(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/sources/{ASSET_ID}/unlock",
            json={"field": "nonexistent_xyz"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["locked"] is False


# ---------------- Validation ----------------
class TestValidation:
    def test_lock_missing_field_returns_400_or_422(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/sources/{ASSET_ID}/lock",
            json={"value": 3},
            timeout=10,
        )
        assert r.status_code in (400, 422)
