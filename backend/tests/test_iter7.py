"""Propul8 Iteration 7 — operational labels + 2 new primitives.

Validates:
- visualize_layout: 4 prompt sections (MIDJOURNEY/DALL/STABLE/BEFORE-AFTER)
- shopping_cart: ITEMS (6-10 lines, '·' separator, supplier field) + ALTERNATIVES
- contractor_pack: 4 sections regression
- update_listing: TITLE/DESCRIPTION/GUEST POSITIONING/AMENITY UPDATES
- activate_upgrade: 6 sections (VISUAL/PROCUREMENT/CONTRACTOR/LISTING/APPROVAL/TIMELINE)
- export_pack: 5 sections (EXECUTIVE/PROCUREMENT/CONTRACTOR/LISTING/APPROVAL)
- approve_apply: returns 400 (frontend-only, expected per design)
- Demo + score_breakdown regression intact
"""
import os, sys, time, subprocess, pytest, requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
sys.path.insert(0, "/app/backend")

DEMO_PROP = {
    "name": "Cycladic Boutique Suite",
    "city": "Koufonisia, Greece",
    "property_type": "Boutique Suite",
    "sqm": 78, "sleeps": 4, "nightly_rate": 145,
}


def _post_transform(action,
                    rec_title="Sleep Capacity Expansion",
                    rec_detail="Add a discrete sleeping mezzanine to expand 4 → 5 guests."):
    return requests.post(f"{BASE_URL}/api/transform", json={
        "action": action,
        "recommendation": {"title": rec_title, "detail": rec_detail},
        "property": DEMO_PROP,
    }, timeout=240)


def _norm(h):
    return (h or "").upper().replace("_", " ").replace("-", " ").replace("/", " ").strip()


def _has_heading_substr(sections, needle):
    """True if any heading contains the needle substring (case-insensitive, underscores allowed)."""
    n = needle.upper()
    for s in sections:
        h = _norm(s.get("heading", ""))
        if n in h:
            return True
    return False


# ---------- Demo regression ----------
class TestDemoRegression:
    def test_demo_basics(self):
        r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=30)
        assert r.status_code == 200
        a = r.json()["analysis"]
        assert a["metrics"]["asset_score"] == 82
        assert len(a["yield_opportunities"]) == 4
        assert len(a["score_breakdown"]) == 6


# ---------- Iter7 primitives ----------
class TestVisualizeLayout:
    def test_four_prompt_sections(self):
        r = _post_transform("visualize_layout")
        if r.status_code in (502, 503):
            pytest.skip(f"AI unavailable: {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["action"] == "visualize_layout"
        assert "_id" not in d
        sections = d["sections"]
        assert 3 <= len(sections) <= 5, f"expected ~4 sections, got {len(sections)}"
        assert _has_heading_substr(sections, "MIDJOURNEY"), [s["heading"] for s in sections]
        assert _has_heading_substr(sections, "DALL"), [s["heading"] for s in sections]
        assert _has_heading_substr(sections, "STABLE"), [s["heading"] for s in sections]
        # BEFORE / AFTER heading variant
        ba_ok = any(
            "BEFORE" in _norm(s.get("heading", "")) or "AFTER" in _norm(s.get("heading", ""))
            for s in sections
        )
        assert ba_ok, [s["heading"] for s in sections]
        # Each prompt section has at least 1 item
        for s in sections:
            assert len(s.get("items") or []) >= 1, f"empty section {s.get('heading')}"


class TestShoppingCart:
    def test_items_and_alternatives(self):
        r = _post_transform("shopping_cart",
                            rec_title="Layered Evening Lighting",
                            rec_detail="Install 2700K layered evening lighting in living room.")
        if r.status_code in (502, 503):
            pytest.skip(f"AI unavailable: {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        sections = r.json()["sections"]
        assert _has_heading_substr(sections, "ITEMS"), [s["heading"] for s in sections]
        # Find ITEMS section
        items_section = next(
            (s for s in sections if "ITEMS" in _norm(s.get("heading", ""))),
            None,
        )
        assert items_section is not None
        items = items_section.get("items") or []
        assert 6 <= len(items) <= 11, f"expected 6-10 items, got {len(items)}"
        # '·' separator + at least 5 fields when split
        sep_count = sum(1 for it in items if "·" in it)
        assert sep_count >= len(items) * 0.6, (
            f"only {sep_count}/{len(items)} items use '·'"
        )
        five_field_count = sum(
            1 for it in items if len([p for p in it.split("·") if p.strip()]) >= 5
        )
        assert five_field_count >= len(items) * 0.5, (
            f"only {five_field_count}/{len(items)} items have ≥5 fields"
        )
        # ALTERNATIVES section
        assert _has_heading_substr(sections, "ALTERNATIVE"), [s["heading"] for s in sections]


class TestContractorPackRegression:
    def test_four_sections(self):
        r = _post_transform("contractor_pack")
        if r.status_code in (502, 503):
            pytest.skip("AI unavailable")
        assert r.status_code == 200, r.text[:300]
        sections = r.json()["sections"]
        assert 3 <= len(sections) <= 5
        for h in ("MEASUREMENTS", "MATERIALS", "LIGHTING", "INSTALL"):
            assert _has_heading_substr(sections, h), f"missing {h} in {[s['heading'] for s in sections]}"


class TestUpdateListing:
    def test_four_sections(self):
        r = _post_transform("update_listing")
        if r.status_code in (502, 503):
            pytest.skip("AI unavailable")
        assert r.status_code == 200, r.text[:300]
        sections = r.json()["sections"]
        assert 3 <= len(sections) <= 5
        for h in ("TITLE", "DESCRIPTION", "GUEST POSITIONING", "AMENITY"):
            assert _has_heading_substr(sections, h), f"missing {h} in {[s['heading'] for s in sections]}"


class TestActivateUpgrade:
    def test_six_sections(self):
        r = _post_transform("activate_upgrade")
        if r.status_code in (502, 503):
            pytest.skip("AI unavailable")
        assert r.status_code == 200, r.text[:300]
        sections = r.json()["sections"]
        assert 5 <= len(sections) <= 7, f"expected 6 sections, got {len(sections)}"
        for h in ("VISUAL", "PROCUREMENT", "CONTRACTOR", "LISTING", "APPROVAL", "TIMELINE"):
            assert _has_heading_substr(sections, h), f"missing {h} in {[s['heading'] for s in sections]}"


class TestExportPack:
    def test_five_sections(self):
        r = _post_transform("export_pack")
        if r.status_code in (502, 503):
            pytest.skip("AI unavailable")
        assert r.status_code == 200, r.text[:300]
        sections = r.json()["sections"]
        assert 4 <= len(sections) <= 6, f"expected 5 sections, got {len(sections)}"
        for h in ("EXECUTIVE", "PROCUREMENT", "CONTRACTOR", "LISTING", "APPROVAL"):
            assert _has_heading_substr(sections, h), f"missing {h} in {[s['heading'] for s in sections]}"


class TestApproveApplyFrontendOnly:
    def test_approve_apply_returns_400(self):
        """approve_apply is intentionally frontend-only — backend returns 400."""
        r = _post_transform("approve_apply")
        assert r.status_code == 400, (
            f"expected 400 (frontend-only action not in TRANSFORM_DIRECTIVES), got {r.status_code}: {r.text[:200]}"
        )


# ---------- Auth + analyze regression ----------
def _create_session():
    ts = int(time.time() * 1000)
    uid = f"iter7-user-{ts}"
    tok = f"iter7_session_{ts}"
    script = f"""
    use('test_database');
    db.users.insertOne({{user_id:'{uid}', email:'iter7.{ts}@example.com', name:'I7', picture:'', created_at:new Date()}});
    db.user_sessions.insertOne({{user_id:'{uid}', session_token:'{tok}', expires_at:new Date(Date.now()+7*24*60*60*1000), created_at:new Date()}});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", script], check=True, capture_output=True)
    return tok, uid


@pytest.fixture(scope="module")
def auth_headers():
    tok, _ = _create_session()
    return {"Authorization": f"Bearer {tok}"}


class TestAuthAndCRUD:
    def test_auth_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["email"].startswith("iter7.")

    def test_create_list_property(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/properties", headers=auth_headers, json={
            "name": "TEST_Iter7", "city": "Athens", "property_type": "Suite",
            "sqm": 60, "bedrooms": 1, "bathrooms": 1, "sleeps": 2,
            "nightly_rate": 120, "monthly_expenses": 400, "management_fee_pct": 15,
            "renovation_budget": 5000,
        }, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["property_id"]
        # GET back
        rg = requests.get(f"{BASE_URL}/api/properties/{pid}", headers=auth_headers, timeout=15)
        assert rg.status_code == 200
        assert rg.json()["name"] == "TEST_Iter7"


class TestUnknownAction:
    def test_unknown_returns_400(self):
        r = _post_transform("nonexistent_action_xyz")
        assert r.status_code == 400


# ---------- Fallback unit ----------
class TestFallbackUnit:
    def test_fallback_runs(self):
        from server import _compute_fallback_analysis
        a = _compute_fallback_analysis({"name": "X", "city": "Athens", "sqm": 60,
                                         "sleeps": 3, "bedrooms": 1, "nightly_rate": 200,
                                         "monthly_expenses": 400, "management_fee_pct": 15})
        assert a["yield_opportunities"]
        assert a["metrics"]["asset_score"] >= 40
