"""Propul8 Iter32 — Listing-data verification + per-field confidence."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ── /api/invest/ingest — confidence per field ───────────────────────
class TestIngestConfidence:
    def test_response_includes_confidence_map(self, s):
        r = s.post(f"{BASE_URL}/api/invest/ingest",
                   json={"url": "https://example.com/some-listing"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "_confidence" in body
        # every documented field has a confidence entry
        c = body["_confidence"]
        for k in (
            "asking_price_eur", "m2", "city", "rooms", "bathrooms", "floor",
            "energy_class", "parking", "renovation_state", "property_type",
            "listing_source", "url",
        ):
            assert k in c, f"missing confidence for {k}"
            assert c[k] in ("verified", "needs_review", "missing", "user_verified"), c[k]

    def test_unfetchable_url_returns_missing_for_critical_fields(self, s):
        # An unreachable / nonsense URL → critical fields must be `null` and
        # confidence == 'missing'. Propul8 never fakes critical numbers.
        r = s.post(f"{BASE_URL}/api/invest/ingest",
                   json={"url": "https://this-domain-does-not-exist-ever.invalid/listing"},
                   timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("asking_price_eur") is None
        assert body.get("m2") is None
        assert body["_confidence"]["asking_price_eur"] == "missing"
        assert body["_confidence"]["m2"] == "missing"

    def test_user_overrides_marked_user_verified(self, s):
        r = s.post(f"{BASE_URL}/api/invest/ingest", json={
            "url": "https://example.com/listing",
            "asking_price_eur": 430000,
            "m2": 220,
            "city": "Porto Heli",
            "rooms": 3,
        }, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["asking_price_eur"] == 430000
        assert body["m2"] == 220
        assert body["city"] == "Porto Heli"
        assert body["rooms"] == 3
        c = body["_confidence"]
        assert c["asking_price_eur"] == "user_verified"
        assert c["m2"] == "user_verified"
        assert c["city"] == "user_verified"
        assert c["rooms"] == "user_verified"

    def test_listing_source_inferred_from_url(self, s):
        cases = [
            ("https://www.engelvoelkers.com/en/properties/abc",   "Engel & Völkers"),
            ("https://www.spitogatos.gr/en/listing/xyz",           "Spitogatos"),
            ("https://sothebysrealty.com/eng/property/123",        "Sotheby's International Realty"),
            ("https://www.airbnb.com/rooms/456",                   "Airbnb"),
            ("https://www.booking.com/hotel/foo",                  "Booking.com"),
        ]
        for url, expected in cases:
            r = s.post(f"{BASE_URL}/api/invest/ingest", json={"url": url}, timeout=15)
            assert r.status_code == 200
            assert r.json()["listing_source"] == expected, f"{url}"


# ── PUT /api/invest/draft/:id — user verification ───────────────────
class TestDraftUpdate:
    def test_put_marks_fields_user_verified(self, s):
        # Create a draft with extracted (but uncertain) data.
        created = s.post(f"{BASE_URL}/api/invest/draft", json={
            "url": "https://example.com/x",
            "asking_price_eur": None,
            "m2": None,
            "city": None,
            "provenance": {"asking_price_eur": "missing", "m2": "missing", "city": "missing"},
        }, timeout=10).json()
        draft_id = created["draft_id"]

        # User confirms / corrects 4 critical fields.
        r = s.put(f"{BASE_URL}/api/invest/draft/{draft_id}", json={
            "asking_price_eur": 430000,
            "m2": 220,
            "city": "Porto Heli",
            "rooms": 3,
        }, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["asking_price_eur"] == 430000
        assert body["m2"] == 220
        assert body["city"] == "Porto Heli"
        # All four critical fields must now report user_verified.
        c = body["_confidence"]
        assert c["asking_price_eur"] == "user_verified"
        assert c["m2"] == "user_verified"
        assert c["city"] == "user_verified"
        assert c["rooms"] == "user_verified"

    def test_put_unknown_draft_returns_404(self, s):
        r = s.put(f"{BASE_URL}/api/invest/draft/dft_doesnotexist", json={"city": "x"}, timeout=10)
        assert r.status_code == 404

    def test_put_persists_across_get(self, s):
        created = s.post(f"{BASE_URL}/api/invest/draft", json={
            "url": "https://example.com/persist", "city": None,
        }, timeout=10).json()
        draft_id = created["draft_id"]
        s.put(f"{BASE_URL}/api/invest/draft/{draft_id}", json={"city": "Athens"}, timeout=10)

        r = s.get(f"{BASE_URL}/api/invest/draft/{draft_id}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["city"] == "Athens"
        assert body["_confidence"]["city"] == "user_verified"
