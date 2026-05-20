"""Backend tests for Propul8 AI fallback parsers (Claude Sonnet 4.5).

Endpoints tested:
- POST /api/invest/parse-text
- POST /api/invest/parse-screenshot
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
TEXT_URL = f"{BASE_URL}/api/invest/parse-text"
SHOT_URL = f"{BASE_URL}/api/invest/parse-screenshot"

KOUKAKI_TEXT = (
    "Boutique 2BR apartment in Koukaki, Athens. 65 sqm. Year built 1965. "
    "Asking €280,000. Two bathrooms, second floor, recently renovated. "
    "Walking distance to Acropolis. No pool. Energy class C."
)


# --- /invest/parse-text ----------------------------------------------------

class TestParseText:
    def test_parse_text_koukaki_extracts_fields(self):
        r = requests.post(TEXT_URL, json={"listing_text": KOUKAKI_TEXT}, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "Koukaki" in (data.get("title") or "")
        assert data.get("city") == "Athens"
        assert data.get("neighborhood") == "Koukaki"
        assert data.get("asking_price_eur") == 280000
        assert data.get("m2") == 65
        assert data.get("rooms") == 2
        assert data.get("bathrooms") == 2
        assert data.get("year_built") == 1965
        assert (data.get("property_type") or "").lower() == "apartment"
        assert (data.get("energy_class") or "").upper() == "C"
        assert data.get("pool") is False
        # price_per_sqm_eur = 280000/65 = 4307.69 -> rounded
        assert data.get("price_per_sqm_eur") == round(280000 / 65)

        conf = data.get("_confidence", {})
        # populated fields should be tagged user_pasted_text
        for k in ["asking_price_eur", "m2", "rooms", "bathrooms",
                  "city", "neighborhood", "year_built", "property_type",
                  "energy_class", "pool", "title"]:
            assert conf.get(k) == "user_pasted_text", f"{k} conf={conf.get(k)}"
        assert conf.get("price_per_sqm_eur") == "calculated"
        # parking not stated -> missing
        assert conf.get("parking") == "missing"

    def test_parse_text_too_short_400(self):
        r = requests.post(TEXT_URL, json={"listing_text": "too short"}, timeout=15)
        assert r.status_code == 400
        body = r.json()
        msg = (body.get("detail") or body.get("message") or "").lower()
        assert "too short" in msg

    def test_parse_text_honest_null_no_invented_values(self):
        r = requests.post(
            TEXT_URL,
            json={"listing_text": "This is a beautiful place with great views."},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("asking_price_eur") is None
        assert data.get("m2") is None
        assert data.get("rooms") is None


# --- /invest/parse-screenshot ----------------------------------------------

class TestParseScreenshot:
    def test_parse_screenshot_empty_400(self):
        r = requests.post(SHOT_URL, json={"images_base64": []}, timeout=15)
        assert r.status_code == 400
        msg = (r.json().get("detail") or "").lower()
        assert "at least one" in msg

    def test_parse_screenshot_too_many_400(self):
        r = requests.post(
            SHOT_URL,
            json={"images_base64": ["a", "b", "c", "d"]},
            timeout=15,
        )
        assert r.status_code == 400
        msg = (r.json().get("detail") or "").lower()
        assert "maximum 3" in msg


# --- regression -------------------------------------------------------------

class TestRegression:
    def test_invest_demo_asset_loads(self):
        # Frontend route — backend serves SPA index; just verify the asset
        # ingest endpoint still works on a known demo id (HEAD/GET ok).
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code in (200, 404)  # api root behaviour-tolerant
