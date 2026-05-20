"""Propul8 Iteration 3 — /api/transform endpoint tests (public, AI-backed)."""
import pytest
import requests

DEMO_PROP = {
    "name": "Cycladic Boutique Suite",
    "city": "Koufonisia, Greece",
    "property_type": "Boutique Suite",
    "sqm": 78,
    "sleeps": 4,
    "nightly_rate": 145,
}


def _validate_schema(d, action):
    assert isinstance(d, dict)
    assert "_id" not in d
    assert d.get("action") == action
    assert isinstance(d.get("headline"), str) and len(d["headline"]) > 0
    assert isinstance(d.get("tldr"), str) and len(d["tldr"]) > 0
    sections = d.get("sections")
    assert isinstance(sections, list) and 3 <= len(sections) <= 6
    for s in sections:
        assert isinstance(s, dict)
        assert isinstance(s.get("heading"), str) and len(s["heading"]) > 0
        items = s.get("items")
        assert isinstance(items, list) and len(items) >= 1
        for it in items:
            assert isinstance(it, str) and len(it) > 0


class TestTransformPublic:
    def test_transform_no_auth_required(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "shopping_list",
                "recommendation": {
                    "title": "Programmed 2700K evening lighting layer",
                    "detail": "Layered indirect 2700K sources for night-time perception.",
                },
                "property": DEMO_PROP,
            },
            timeout=120,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI provider unavailable: {r.status_code}")
        assert r.status_code == 200, r.text
        _validate_schema(r.json(), "shopping_list")

    def test_transform_shot_list_photography(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "shot_list",
                "recommendation": {
                    "title": "Editorial photography refresh",
                    "detail": "Architecturally directed shoot, golden-hour exteriors and lifestyle interiors.",
                },
                "property": DEMO_PROP,
            },
            timeout=120,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI provider unavailable: {r.status_code}")
        assert r.status_code == 200, r.text
        d = r.json()
        _validate_schema(d, "shot_list")
        # The shot list directive should produce photographic-feeling content
        joined = (d["headline"] + " " + d["tldr"] + " " +
                  " ".join(s["heading"] for s in d["sections"])).lower()
        assert any(k in joined for k in ("frame", "shot", "light", "golden",
                                         "editorial", "image", "photo"))

    def test_transform_lighting_plan(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "lighting_plan",
                "recommendation": {
                    "title": "Programmed 2700K evening lighting layer",
                    "detail": "Wall washers, recessed linear LEDs, sculptural pendant.",
                },
                "property": DEMO_PROP,
            },
            timeout=120,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI provider unavailable: {r.status_code}")
        assert r.status_code == 200, r.text
        _validate_schema(r.json(), "lighting_plan")

    def test_transform_terrace_concept(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "terrace_concept",
                "recommendation": {
                    "title": "Outdoor dining program",
                    "detail": "Stone bench seating, linen pergola, slim-profile dining rail.",
                },
                "property": DEMO_PROP,
            },
            timeout=120,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI provider unavailable: {r.status_code}")
        assert r.status_code == 200, r.text
        _validate_schema(r.json(), "terrace_concept")

    def test_transform_airbnb_title(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "airbnb_title",
                "recommendation": {
                    "title": "Listing copy + amenity restyling",
                    "detail": "Editorial Airbnb listing copy refresh.",
                },
                "property": DEMO_PROP,
            },
            timeout=120,
        )
        if r.status_code in (502, 503):
            pytest.skip(f"AI provider unavailable: {r.status_code}")
        assert r.status_code == 200, r.text
        _validate_schema(r.json(), "airbnb_title")


class TestTransformErrors:
    def test_invalid_action_returns_400(self, base_url):
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "not_a_real_action",
                "recommendation": {"title": "x", "detail": "y"},
                "property": {},
            },
        )
        assert r.status_code == 400, r.text

    def test_malformed_body_returns_422(self, base_url):
        # Missing required 'action'
        r = requests.post(
            f"{base_url}/api/transform",
            json={"recommendation": {"title": "x"}},
        )
        assert r.status_code == 422, r.text

    def test_no_cookie_no_bearer_still_allowed(self, base_url):
        # Sanity: 400 (validation failure) confirms the route accepted the request
        # without auth — i.e., the endpoint is public.
        r = requests.post(
            f"{base_url}/api/transform",
            json={
                "action": "bad",
                "recommendation": {},
                "property": {},
            },
        )
        assert r.status_code == 400
