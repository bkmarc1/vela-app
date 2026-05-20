"""Iter 59 backend tests — extracted routers + new dashboard endpoints."""
from __future__ import annotations

import os
import time
import uuid
import pytest
import requests

def _load_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    # Fallback to frontend/.env file
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        for line in open(env_path):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_url()
TIMEOUT = 60


# ---------- Sources router (extracted) ----------
class TestSourcesRouter:
    def test_sources_get_baseline(self):
        r = requests.get(f"{BASE_URL}/api/sources/demo", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["asset_id"] == "demo"
        assert isinstance(data["locks"], list)

    def test_sources_lock_unlock_roundtrip(self):
        field = f"test_field_{uuid.uuid4().hex[:8]}"
        # lock
        r = requests.post(
            f"{BASE_URL}/api/sources/demo/lock",
            json={"field": field, "value": "42", "locked_by": "iter59_test"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["field"] == field
        assert body["value"] == "42"
        assert body["locked_by"] == "iter59_test"
        assert "locked_at" in body

        # GET should show this lock
        g = requests.get(f"{BASE_URL}/api/sources/demo", timeout=TIMEOUT).json()
        assert any(lock["field"] == field for lock in g["locks"])

        # unlock
        u = requests.post(
            f"{BASE_URL}/api/sources/demo/unlock",
            json={"field": field},
            timeout=TIMEOUT,
        )
        assert u.status_code == 200, u.text
        assert u.json()["locked"] is False

        # confirm gone
        g2 = requests.get(f"{BASE_URL}/api/sources/demo", timeout=TIMEOUT).json()
        assert not any(lock["field"] == field for lock in g2["locks"])


# ---------- Location router (extracted) ----------
class TestLocationRouter:
    def test_provider_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/location/provider", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] in ("openstreetmap", "google")
        assert "google_configured" in data

    def test_analyze_glyfada(self):
        r = requests.post(
            f"{BASE_URL}/api/location/analyze",
            json={"address": "Glyfada, Athens, Greece"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Required scoring fields
        for key in ("scores", "verdict", "top_drivers", "resolved_address"):
            assert key in data, f"missing {key} in {list(data.keys())}"
        assert isinstance(data["verdict"], str)
        assert isinstance(data["scores"], dict)
        # scores dict should have overall + sub-scores
        assert "location" in data["scores"], f"scores keys: {list(data['scores'].keys())}"


# ---------- Dashboard router (NEW) ----------
class TestDashboardRouter:
    def test_news_returns_items(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/news?limit=3", timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data and "count" in data and "generated_at" in data
        assert data["count"] == len(data["items"])
        assert data["count"] > 0, "Expected at least one news item from live RSS feeds"

        item = data["items"][0]
        for key in ("title", "url", "source"):
            assert key in item, f"news item missing {key}"
        assert item["title"]
        assert item["url"].startswith("http")

    def test_news_cached_on_second_call(self):
        t0 = time.time()
        requests.get(f"{BASE_URL}/api/dashboard/news?limit=3", timeout=90)
        cold = time.time() - t0
        t1 = time.time()
        r2 = requests.get(f"{BASE_URL}/api/dashboard/news?limit=3", timeout=90)
        warm = time.time() - t1
        assert r2.status_code == 200
        # Warm call should be quick (allow generous margin)
        assert warm < max(cold, 5.0), f"warm={warm:.2f}s cold={cold:.2f}s"

    def test_competition_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/competition", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "acquisition" in data and "operate" in data
        for block_name in ("acquisition", "operate"):
            block = data[block_name]
            for key in ("portfolio_score", "market_average", "top_quartile",
                        "delta_vs_market", "delta_vs_top"):
                assert key in block, f"{block_name} missing {key}"
            assert 0 <= block["portfolio_score"] <= 100
            assert 0 <= block["market_average"] <= 100
            assert 0 <= block["top_quartile"] <= 100
        assert "summary" in data and isinstance(data["summary"], str)
        assert "data_quality" in data
        assert "has_real_comparables" in data
