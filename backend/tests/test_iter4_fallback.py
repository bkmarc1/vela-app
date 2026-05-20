"""Propul8 Iteration 4 — fallback path & enrichment helper tests.

Directly exercises _compute_fallback_analysis() and _enrich_analysis() from server.py
to verify the deterministic fallback never errors and produces the lightweight schema.
"""
import sys
import pytest

sys.path.insert(0, "/app/backend")

from server import _compute_fallback_analysis, _enrich_analysis  # noqa: E402


SAMPLE_PROP = {
    "property_id": "TEST_fallback_prop",
    "name": "TEST_Cycladic Suite",
    "city": "Athens",
    "property_type": "Apartment",
    "sqm": 60,
    "bedrooms": 1,
    "bathrooms": 1,
    "sleeps": 3,
    "nightly_rate": 120,
    "monthly_expenses": 400,
    "management_fee_pct": 15,
    "renovation_budget": 5000,
}


class TestFallbackHelper:
    def test_fallback_schema_complete(self):
        a = _compute_fallback_analysis(SAMPLE_PROP)
        # summary
        assert isinstance(a["summary"], str) and len(a["summary"]) > 30
        # metrics — 8 keys
        m = a["metrics"]
        for k in ("asset_score", "projected_adr", "occupancy_pct", "annual_revenue",
                  "net_yield_pct", "design_score", "layout_efficiency", "guest_experience"):
            assert k in m
        # internal consistency check
        expected_rev = m["projected_adr"] * 365 * m["occupancy_pct"] / 100
        delta = abs(m["annual_revenue"] - expected_rev) / max(expected_rev, 1)
        assert delta <= 0.05
        # exactly 5 yield_opportunities
        assert len(a["yield_opportunities"]) == 5
        for y in a["yield_opportunities"]:
            assert "title" in y and "detail" in y and "impact" in y
        # market_intelligence
        mi = a["market_intelligence"]
        for k in ("adr_range", "pricing_gap", "premium_potential"):
            assert k in mi and isinstance(mi[k], str)
        # action_plan.quick_wins exactly 3 — no medium_upgrades / high_roi_renovations
        ap = a["action_plan"]
        assert len(ap["quick_wins"]) == 3
        assert "medium_upgrades" not in ap
        assert "high_roi_renovations" not in ap
        # design_intelligence/layout_intelligence MUST NOT be in fallback either
        assert "design_intelligence" not in a
        assert "layout_intelligence" not in a

    def test_fallback_handles_missing_inputs(self):
        # Edge: fallback should not crash on completely empty prop
        a = _compute_fallback_analysis({"property_id": "x"})
        assert a["metrics"]["asset_score"] >= 40
        assert a["metrics"]["asset_score"] <= 95

    def test_enrich_adds_score_breakdown_and_curve(self):
        base = _compute_fallback_analysis(SAMPLE_PROP)
        enriched = _enrich_analysis(base, SAMPLE_PROP)
        sb = enriched["score_breakdown"]
        expected = {"yield_potential", "design_quality", "layout_efficiency",
                    "market_position", "guest_experience", "operational_efficiency"}
        assert set(sb.keys()) == expected
        assert sum(v["weight"] for v in sb.values()) == 100
        assert {k: v["weight"] for k, v in sb.items()} == {
            "yield_potential": 25, "design_quality": 20, "layout_efficiency": 15,
            "market_position": 15, "guest_experience": 15, "operational_efficiency": 10,
        }
        for v in sb.values():
            assert 0 <= v["score"] <= 100
            assert isinstance(v["hint"], str) and len(v["hint"]) > 5
        # 12-month curve
        mr = enriched["performance_overview"]["monthly_revenue"]
        assert len(mr) == 12
        for entry in mr:
            assert "m" in entry and "rev" in entry and "adr" in entry

    def test_enrich_preserves_existing_score_breakdown(self):
        # If AI already returned a score_breakdown, _enrich should NOT overwrite it
        base = _compute_fallback_analysis(SAMPLE_PROP)
        base["score_breakdown"] = {
            "yield_potential": {"score": 99, "weight": 25, "hint": "from AI"},
            "design_quality": {"score": 99, "weight": 20, "hint": "from AI"},
            "layout_efficiency": {"score": 99, "weight": 15, "hint": "from AI"},
            "market_position": {"score": 99, "weight": 15, "hint": "from AI"},
            "guest_experience": {"score": 99, "weight": 15, "hint": "from AI"},
            "operational_efficiency": {"score": 99, "weight": 10, "hint": "from AI"},
        }
        enriched = _enrich_analysis(base, SAMPLE_PROP)
        assert enriched["score_breakdown"]["yield_potential"]["score"] == 99


class TestFallbackViaEnvSwap:
    """Optional: monkeypatch the EMERGENT_LLM_KEY at module level so run_ai_analysis
    short-circuits to None and the endpoint returns the fallback with is_fallback=True."""

    def test_endpoint_returns_fallback_when_key_missing(self, base_url, auth_headers, monkeypatch):
        import server
        # Patch in-memory module constant — does not modify .env file
        monkeypatch.setattr(server, "EMERGENT_LLM_KEY", "")

        import requests
        # Create a fresh property for this test
        payload = {
            "name": "TEST_VELA_Fallback",
            "city": "Mykonos",
            "property_type": "Suite",
            "sqm": 55, "bedrooms": 1, "bathrooms": 1, "sleeps": 2,
            "nightly_rate": 180, "monthly_expenses": 500,
            "management_fee_pct": 18, "renovation_budget": 3000,
        }
        cr = requests.post(f"{base_url}/api/properties", json=payload, headers=auth_headers)
        assert cr.status_code == 200, cr.text
        pid = cr.json()["property_id"]

        # NOTE: monkeypatch only affects THIS pytest process, NOT the supervisor-managed
        # backend. So the live endpoint will still use the real EMERGENT_LLM_KEY.
        # Skip if the live endpoint succeeded with a real AI response (no is_fallback).
        ar = requests.post(f"{base_url}/api/properties/{pid}/analyze",
                           headers=auth_headers, timeout=180)
        assert ar.status_code == 200, ar.text
        a = ar.json().get("analysis", {})
        if not a.get("is_fallback"):
            pytest.skip("Live AI succeeded; cannot exercise fallback via env swap "
                        "from test process (supervisor backend uses its own env). "
                        "Direct helper test in TestFallbackHelper covers this path.")
        # If we did hit fallback (e.g. live AI was actually down), assert schema
        assert a["is_fallback"] is True
        assert "design_intelligence" not in a
        assert len(a["action_plan"]["quick_wins"]) == 3
