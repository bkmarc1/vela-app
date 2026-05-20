"""Iter44 — MASTER FIX brief backend test.
Tests /api/invest/ingest with Spitogatos URL returns bot_blocked=true,
_confidence with 'source_blocked', and extraction_debug payload.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestInvestIngestSpitogatos:
    """Spitogatos ingest must surface bot_blocked + source_blocked confidence + extraction_debug."""

    def test_spitogatos_ingest_returns_bot_blocked_and_debug(self, api):
        url = "https://www.spitogatos.gr/en/property/1119010147"
        resp = api.post(f"{BASE_URL}/api/invest/ingest", json={"url": url}, timeout=60)
        assert resp.status_code == 200, f"Status {resp.status_code}: {resp.text[:400]}"
        data = resp.json()

        # 1. listing_source surfaces spitogatos
        ls = (data.get("listing_source") or "").lower()
        assert "spito" in ls or ls != "", f"listing_source missing/wrong: {ls}"

        # 2. bot_blocked=True for spitogatos
        assert data.get("bot_blocked") is True, f"Expected bot_blocked=True, got {data.get('bot_blocked')}"

        # 3. _confidence map with source_blocked for missing fields
        conf = data.get("_confidence") or {}
        assert isinstance(conf, dict) and conf, "_confidence missing or empty"
        blocked_fields = [k for k, v in conf.items() if v == "source_blocked"]
        assert len(blocked_fields) >= 1, f"Expected source_blocked in _confidence, got {conf}"

        # 4. extraction_debug payload shape
        debug = data.get("extraction_debug") or {}
        assert isinstance(debug, dict) and debug, "extraction_debug missing"
        for key in ("http_status", "bot_blocked", "extraction_layers", "json_ld_count", "spito_signals"):
            assert key in debug, f"extraction_debug missing key '{key}': has {list(debug.keys())}"

        # 5. spito_signals dict present (even if empty when blocked)
        assert isinstance(debug.get("spito_signals"), dict)

        # 6. http_status numeric
        assert isinstance(debug.get("http_status"), int)

        print("✓ bot_blocked:", data.get("bot_blocked"))
        print("✓ source_blocked fields:", blocked_fields[:8])
        print("✓ extraction_debug keys:", list(debug.keys()))

    def test_invest_ingest_health_non_spito_url(self, api):
        """Sanity: a non-spito URL still returns a 200 + _confidence."""
        resp = api.post(
            f"{BASE_URL}/api/invest/ingest",
            json={"url": "https://www.airbnb.com/rooms/12345"},
            timeout=60,
        )
        assert resp.status_code == 200, resp.text[:200]
        data = resp.json()
        assert "_confidence" in data
        assert "extraction_debug" in data
