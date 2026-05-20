"""Propul8 backend test suite — health, demo, auth, properties CRUD, uploads, AI analysis."""
import io
import os
import struct
import zlib
import pytest
import requests


def _png_bytes(w=64, h=64):
    """Generate a real-content (gradient) PNG for vision testing."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.append((x * 4) % 256)        # R gradient
            raw.append((y * 4) % 256)        # G gradient
            raw.append(((x + y) * 2) % 256)  # B gradient
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


# ---- Health ----
class TestHealth:
    def test_root(self, base_url):
        r = requests.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["service"] == "Propul8"


# ---- Demo property (public) ----
class TestDemo:
    def test_demo_public(self, base_url):
        r = requests.get(f"{base_url}/api/properties/demo")
        assert r.status_code == 200
        d = r.json()
        assert d["property_id"] == "demo-cycladic-boutique-suite"
        assert d["is_demo"] is True
        a = d["analysis"]
        assert a["metrics"]["asset_score"] == 82
        assert a["metrics"]["projected_adr"] == 145
        assert a["metrics"]["occupancy_pct"] == 71
        assert a["metrics"]["annual_revenue"] == 37550
        assert a["metrics"]["net_yield_pct"] == 8.6
        assert a["metrics"]["design_score"] == 78
        assert a["metrics"]["layout_efficiency"] == 84
        assert a["metrics"]["guest_experience"] == 80
        assert len(a["performance_overview"]["monthly_revenue"]) == 12
        assert len(a["yield_opportunities"]) >= 4
        assert "design_intelligence" in a and "layout_intelligence" in a and "market_intelligence" in a
        assert len(a["action_plan"]["quick_wins"]) >= 3
        assert len(a["action_plan"]["medium_upgrades"]) >= 3
        assert len(a["action_plan"]["high_roi_renovations"]) >= 2
        assert "_id" not in d

    # ---- Iteration 2 — score_breakdown ----
    def test_demo_score_breakdown(self, base_url):
        r = requests.get(f"{base_url}/api/properties/demo")
        assert r.status_code == 200
        a = r.json()["analysis"]
        sb = a.get("score_breakdown")
        assert sb, "score_breakdown missing"
        expected = {"yield_potential", "design_quality", "layout_efficiency",
                    "market_position", "guest_experience", "operational_efficiency"}
        assert set(sb.keys()) == expected, f"unexpected keys: {set(sb.keys())}"
        for k, v in sb.items():
            assert "score" in v and isinstance(v["score"], int)
            assert "weight" in v and isinstance(v["weight"], int)
            assert "hint" in v and isinstance(v["hint"], str) and len(v["hint"]) > 5
        assert sum(v["weight"] for v in sb.values()) == 100
        # Check expected weights per spec
        weights = {k: v["weight"] for k, v in sb.items()}
        assert weights == {
            "yield_potential": 25, "design_quality": 20, "layout_efficiency": 15,
            "market_position": 15, "guest_experience": 15, "operational_efficiency": 10,
        }

    # ---- Iteration 2 — expanded design_intelligence ----
    def test_demo_design_intelligence_expanded(self, base_url):
        a = requests.get(f"{base_url}/api/properties/demo").json()["analysis"]
        di = a["design_intelligence"]
        assert len(di) >= 10, f"expected >=10 keys, got {len(di)}: {list(di.keys())}"
        for k in ("hospitality_positioning", "furnishing_cohesion",
                  "material_palette", "guest_emotional_perception"):
            assert k in di and isinstance(di[k], str) and len(di[k]) > 10

    # ---- Iteration 2 — expanded market_intelligence ----
    def test_demo_market_intelligence_expanded(self, base_url):
        a = requests.get(f"{base_url}/api/properties/demo").json()["analysis"]
        mi = a["market_intelligence"]
        assert len(mi) >= 8, f"expected >=8 keys, got {len(mi)}: {list(mi.keys())}"
        for k in ("local_market_insights", "neighborhood_intelligence", "seasonal_performance"):
            assert k in mi and isinstance(mi[k], str) and len(mi[k]) > 10


# ---- Auth ----
class TestAuth:
    def test_me_unauth(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_properties_unauth(self, base_url):
        r = requests.get(f"{base_url}/api/properties")
        assert r.status_code == 401

    def test_me_with_bearer(self, base_url, auth_headers, session_creds):
        r = requests.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"] == session_creds[1]
        assert d["name"] == "Propul8 Tester"
        assert "@" in d["email"]


# ---- Property CRUD ----
@pytest.fixture(scope="class")
def created_property(base_url, auth_headers):
    payload = {
        "name": "TEST_VELA_Suite",
        "city": "Athens",
        "property_type": "Apartment",
        "sqm": 60, "bedrooms": 1, "bathrooms": 1, "sleeps": 3,
        "nightly_rate": 120, "monthly_expenses": 400,
        "management_fee_pct": 15, "renovation_budget": 5000,
    }
    r = requests.post(f"{base_url}/api/properties", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["property_id"].startswith("prop_")
    assert "_id" not in d
    return d


class TestProperties:
    def test_create(self, created_property):
        assert created_property["name"] == "TEST_VELA_Suite"
        assert created_property["city"] == "Athens"
        assert created_property["analysis"] is None

    def test_list(self, base_url, auth_headers, created_property):
        r = requests.get(f"{base_url}/api/properties", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        ids = [p["property_id"] for p in items]
        assert created_property["property_id"] in ids
        for p in items:
            assert "_id" not in p

    def test_get_one(self, base_url, auth_headers, created_property):
        pid = created_property["property_id"]
        r = requests.get(f"{base_url}/api/properties/{pid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["property_id"] == pid

    def test_get_demo_via_id_route(self, base_url):
        r = requests.get(f"{base_url}/api/properties/demo-cycladic-boutique-suite")
        assert r.status_code == 200
        assert r.json()["property_id"] == "demo-cycladic-boutique-suite"


# ---- Upload + download + analyze ----
class TestUploadAndAnalyze:
    def test_upload_photo(self, base_url, auth_headers, created_property):
        pid = created_property["property_id"]
        png = _png_bytes()
        files = {"file": ("villa.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{base_url}/api/properties/{pid}/upload",
            params={"kind": "photo"},
            headers=auth_headers,
            files=files,
            timeout=120,
        )
        if r.status_code == 503:
            pytest.skip(f"Storage unavailable: {r.text}")
        assert r.status_code == 200, r.text
        ref = r.json()
        assert ref["kind"] == "photo"
        assert ref["content_type"].startswith("image/")
        assert ref["size"] > 0
        assert "file_id" in ref
        # Verify persistence — list property and check files
        r2 = requests.get(f"{base_url}/api/properties/{pid}", headers=auth_headers)
        assert r2.status_code == 200
        assert any(f["file_id"] == ref["file_id"] for f in r2.json().get("files", []))
        # Persist into pytest cache for next tests via module attr
        TestUploadAndAnalyze.photo_id = ref["file_id"]

    def test_upload_floor_plan(self, base_url, auth_headers, created_property):
        pid = created_property["property_id"]
        png = _png_bytes(80, 80)
        files = {"file": ("floor.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{base_url}/api/properties/{pid}/upload",
            params={"kind": "floor_plan"},
            headers=auth_headers,
            files=files,
            timeout=120,
        )
        if r.status_code == 503:
            pytest.skip(f"Storage unavailable: {r.text}")
        assert r.status_code == 200, r.text
        assert r.json()["kind"] == "floor_plan"

    def test_upload_invalid_kind(self, base_url, auth_headers, created_property):
        pid = created_property["property_id"]
        png = _png_bytes(8, 8)
        files = {"file": ("x.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{base_url}/api/properties/{pid}/upload",
            params={"kind": "wrong"},
            headers=auth_headers,
            files=files,
        )
        assert r.status_code == 400

    def test_download_file(self, base_url, auth_headers):
        fid = getattr(TestUploadAndAnalyze, "photo_id", None)
        if not fid:
            pytest.skip("No uploaded file id available")
        r = requests.get(f"{base_url}/api/files/{fid}", headers=auth_headers)
        if r.status_code == 503:
            pytest.skip("Storage unavailable")
        assert r.status_code == 200
        assert len(r.content) > 100

    def test_download_unauth(self, base_url):
        fid = getattr(TestUploadAndAnalyze, "photo_id", "unknown")
        r = requests.get(f"{base_url}/api/files/{fid}")
        assert r.status_code == 401

    def test_analyze(self, base_url, auth_headers, created_property):
        """Iteration 4 — lightweight live /analyze schema. Should NEVER 5xx (fallback)."""
        pid = created_property["property_id"]
        r = requests.post(
            f"{base_url}/api/properties/{pid}/analyze",
            headers=auth_headers,
            timeout=180,
        )
        # Iteration 4: backend should fall back deterministically — never 5xx
        assert r.status_code == 200, f"unexpected {r.status_code}: {r.text[:300]}"
        d = r.json()
        assert "_id" not in d
        a = d.get("analysis")
        assert a, "analysis missing"
        # summary
        assert isinstance(a.get("summary"), str) and len(a["summary"]) > 20
        # metrics — exactly 8 keys
        m = a["metrics"]
        for k in ("asset_score", "projected_adr", "occupancy_pct", "annual_revenue",
                  "net_yield_pct", "design_score", "layout_efficiency", "guest_experience"):
            assert k in m, f"missing metric {k}"
        # internal consistency: annual_revenue ≈ projected_adr × 365 × occupancy/100 (within 5%)
        expected_rev = m["projected_adr"] * 365 * m["occupancy_pct"] / 100
        delta = abs(m["annual_revenue"] - expected_rev) / max(expected_rev, 1)
        assert delta <= 0.05, f"annual_revenue {m['annual_revenue']} vs expected {expected_rev}"
        # score_breakdown — 6 axes with correct weights summing to 100
        sb = a.get("score_breakdown")
        assert sb, "score_breakdown missing"
        expected_breakdown = {"yield_potential", "design_quality", "layout_efficiency",
                              "market_position", "guest_experience", "operational_efficiency"}
        assert set(sb.keys()) == expected_breakdown
        assert sum(v["weight"] for v in sb.values()) == 100
        weights = {k: v["weight"] for k, v in sb.items()}
        assert weights == {
            "yield_potential": 25, "design_quality": 20, "layout_efficiency": 15,
            "market_position": 15, "guest_experience": 15, "operational_efficiency": 10,
        }
        # 12-month performance curve
        assert len(a["performance_overview"]["monthly_revenue"]) == 12
        # exactly 5 yield_opportunities
        assert len(a["yield_opportunities"]) == 5, f"expected 5, got {len(a['yield_opportunities'])}"
        # market_intelligence with 3 required keys
        mi = a["market_intelligence"]
        for k in ("adr_range", "pricing_gap", "premium_potential"):
            assert k in mi and isinstance(mi[k], str) and len(mi[k]) > 0
        # action_plan.quick_wins exactly 3 — and ONLY quick_wins (no medium_upgrades / high_roi_renovations)
        ap = a["action_plan"]
        assert "quick_wins" in ap and len(ap["quick_wins"]) == 3
        assert "medium_upgrades" not in ap
        assert "high_roi_renovations" not in ap
        # Iteration 5 — design_intelligence is BACK on /analyze (6 concise keys)
        assert "design_intelligence" in a
        # layout_intelligence still removed from live /analyze
        assert "layout_intelligence" not in a
        # persistence check
        r2 = requests.get(f"{base_url}/api/properties/{pid}", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["analysis"] is not None


# ---- Logout ----
class TestLogout:
    def test_logout(self, base_url, session_creds):
        # Use cookie for logout (the endpoint reads cookie)
        token, _ = session_creds
        r = requests.post(f"{base_url}/api/auth/logout", cookies={"session_token": token})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # After logout, that token should no longer authenticate
        r2 = requests.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 401
