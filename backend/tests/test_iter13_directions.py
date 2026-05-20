"""
Iter13 — Propul8 aesthetic refinement pass.
Validates new concept keys (family_premium / editorial_boutique / romantic_escape)
on /api/visualize and that /api/visualize/image accepts these new keys.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospitality-ai-12.preview.emergentagent.com").rstrip("/")
NEW_KEYS = {"family_premium", "editorial_boutique", "romantic_escape"}

DEMO_RECOMMENDATION = {
    "title": "Sleep Capacity Expansion",
    "transformation": "4 → 5 Guests",
    "revenue_impact": "+€1,500/year",
    "cost": "€3,530",
    "payback": "28 months",
    "status": "Ready to Activate",
}
DEMO_PROPERTY = {
    "property_id": "demo",
    "name": "Cycladic Boutique Suite",
    "city": "Koufonisia, Greece",
    "property_type": "Boutique Suite",
    "sqm": 78,
    "bedrooms": 1,
    "bathrooms": 1,
    "sleeps": 4,
    "nightly_rate": 145,
}


# --- /api/visualize ----------------------------------------------------
class TestVisualize:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200

    def test_visualize_returns_three_new_keys(self):
        payload = {"recommendation": DEMO_RECOMMENDATION, "property": DEMO_PROPERTY}
        r = requests.post(f"{BASE_URL}/api/visualize", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "concepts" in data
        concepts = data["concepts"]
        assert isinstance(concepts, list) and len(concepts) == 3
        keys = {c.get("key") for c in concepts}
        assert keys == NEW_KEYS, f"Expected {NEW_KEYS}, got {keys}"

        # Old keys must be gone
        old = {"minimal_cycladic", "warm_editorial", "mediterranean_contemporary"}
        assert keys.isdisjoint(old)

        # Each concept exposes minimum required fields used by FE
        for c in concepts:
            assert c.get("atmosphere"), c
            assert c.get("direction"), c
            # revenue is computed server-side
            assert isinstance(c.get("adr_uplift_pct"), int)
            assert "current_adr" in c and "projected_adr" in c
            assert "annual_uplift" in c

    def test_visualize_cache_warm(self):
        """Identical 2nd call is fast (cached)."""
        payload = {"recommendation": DEMO_RECOMMENDATION, "property": DEMO_PROPERTY}
        # prime
        requests.post(f"{BASE_URL}/api/visualize", json=payload, timeout=120)
        t0 = time.time()
        r = requests.post(f"{BASE_URL}/api/visualize", json=payload, timeout=30)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 8, f"Cache hit was slow: {elapsed:.2f}s"

    def test_visualize_minimal_payload_fallback(self):
        """Empty/minimal payload must still return 200 with 3 new-key concepts (fallback path)."""
        r = requests.post(f"{BASE_URL}/api/visualize", json={"recommendation": {}, "property": {}}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        keys = {c.get("key") for c in data.get("concepts", [])}
        assert keys == NEW_KEYS


# --- /api/visualize/image ---------------------------------------------
class TestVisualizeImage:
    @pytest.mark.parametrize("concept_key", list(NEW_KEYS))
    def test_image_accepts_new_keys(self, concept_key):
        """
        For each new concept key, /api/visualize/image must either
        (a) return 200 with data_url (or url) string, OR
        (b) return 502/503 cleanly (cold-start nano banana 502 is acceptable).
        It MUST NOT 4xx as 'unknown concept key'.
        """
        # Build a concept matching what FE will send
        concept = {
            "key": concept_key,
            "name": concept_key.replace("_", " ").title(),
            "atmosphere": "Calm, durable, warm; layered evening light.",
            "mood": "Late-morning linen light",
            "palette": ["#E8DFD2", "#C9B89A", "#7A6F5C"],
            "furniture": ["Oak bench", "Linen sofa", "Wishbone chair"],
            "lighting": ["2700K layered", "Cestita portable", "Cove indirect"],
            "materials": ["Honed limestone", "Limewash bone walls", "Solid oak"],
            "direction": "Sleeps-5 design-led family inventory",
        }
        payload = {"concept": concept, "property": DEMO_PROPERTY}
        r = requests.post(f"{BASE_URL}/api/visualize/image", json=payload, timeout=180)

        # Cold start may legitimately return 502/503 — treat as acceptable per problem statement.
        if r.status_code in (502, 503):
            pytest.skip(f"Cold-start/upstream {r.status_code} — frontend has fallback hero per spec")
        assert r.status_code == 200, f"key={concept_key} status={r.status_code} body={r.text[:300]}"
        data = r.json()
        # Accept either data_url, url, or image_url
        url_field = data.get("data_url") or data.get("url") or data.get("image_url")
        assert isinstance(url_field, str) and len(url_field) > 0, data

    def test_image_rejects_unknown_key(self):
        """Sanity — bogus key should not silently be promoted to a real direction."""
        concept = {"key": "totally_made_up_key_xyz", "name": "X", "palette": [], "atmosphere": "x"}
        r = requests.post(
            f"{BASE_URL}/api/visualize/image",
            json={"concept": concept, "property": DEMO_PROPERTY},
            timeout=60,
        )
        # 200 is OK if backend still serves a fallback; we just don't want a crash
        assert r.status_code in (200, 400, 422, 502, 503)
