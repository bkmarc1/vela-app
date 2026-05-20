"""
Propul8 Iter11 — POST /api/upgrade/cart procurement engine tests.
Verifies: 3 packages (budget/premium/luxury), 6+ items each with required schema,
subtotal arithmetic, cache hit speed, never errors (fallback always available).
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
CART_URL = f"{BASE_URL}/api/upgrade/cart"

REQUIRED_TIERS = {"budget", "premium", "luxury"}
ITEM_REQUIRED_KEYS = {
    "category", "name", "brand", "supplier", "dimensions",
    "qty", "unit_price_eur", "line_total_eur", "alternatives",
}

PAYLOAD = {
    "recommendation": {
        "title": "Layered Evening Lighting",
        "transformation": "Convert flat overhead light to a layered, dim-to-warm evening scene that lifts ADR.",
    },
    "property": {
        "name": "Casa Vela Demo",
        "city": "Athens, Greece",
        "property_type": "Boutique Suite",
        "sleeps": 4,
    },
}


@pytest.fixture(scope="module")
def first_response():
    """First (potentially cold) call — allow up to 90s."""
    r = requests.post(CART_URL, json=PAYLOAD, timeout=90)
    return r


def test_cart_returns_200(first_response):
    assert first_response.status_code == 200, (
        f"Expected 200, got {first_response.status_code}: {first_response.text[:300]}"
    )


def test_cart_has_three_packages(first_response):
    data = first_response.json()
    pkgs = data.get("packages")
    assert isinstance(pkgs, list), "packages must be a list"
    assert len(pkgs) == 3, f"Expected 3 packages, got {len(pkgs)}"
    tiers = {p.get("tier") for p in pkgs}
    assert tiers == REQUIRED_TIERS, f"Expected tiers {REQUIRED_TIERS}, got {tiers}"


def test_each_package_has_min_six_items_with_full_schema(first_response):
    data = first_response.json()
    for pkg in data["packages"]:
        items = pkg.get("items") or []
        assert len(items) >= 6, f"Tier {pkg.get('tier')} has only {len(items)} items (<6)"
        for i, it in enumerate(items):
            missing = ITEM_REQUIRED_KEYS - set(it.keys())
            assert not missing, (
                f"Tier {pkg.get('tier')} item[{i}] missing keys {missing}; got {list(it.keys())}"
            )
            assert isinstance(it["qty"], int) and it["qty"] >= 1, (
                f"Tier {pkg.get('tier')} item[{i}] qty must be int>=1, got {it['qty']}"
            )
            assert isinstance(it["unit_price_eur"], int) and it["unit_price_eur"] > 0
            assert isinstance(it["line_total_eur"], int)
            assert isinstance(it["alternatives"], list), "alternatives must be a list"


def test_subtotal_eur_equals_sum_of_line_totals(first_response):
    data = first_response.json()
    for pkg in data["packages"]:
        expected = sum(int(i["line_total_eur"]) for i in pkg.get("items", []))
        assert pkg.get("subtotal_eur") == expected, (
            f"Tier {pkg.get('tier')}: subtotal_eur={pkg.get('subtotal_eur')} != sum line_totals={expected}"
        )


def test_line_total_equals_qty_times_unit_price(first_response):
    data = first_response.json()
    for pkg in data["packages"]:
        for i, it in enumerate(pkg["items"]):
            expected = int(it["qty"]) * int(it["unit_price_eur"])
            assert it["line_total_eur"] == expected, (
                f"Tier {pkg.get('tier')} item[{i}] line_total {it['line_total_eur']} != "
                f"qty*unit {expected}"
            )


def test_cart_cache_returns_under_2s_on_repeat():
    """2nd identical request should be cached and return quickly."""
    # Prime first
    requests.post(CART_URL, json=PAYLOAD, timeout=90)
    t0 = time.time()
    r = requests.post(CART_URL, json=PAYLOAD, timeout=10)
    elapsed = time.time() - t0
    assert r.status_code == 200
    assert elapsed < 2.0, f"Expected cached response <2s, got {elapsed:.2f}s"


def test_cart_never_errors_on_minimal_payload():
    """Empty recommendation+property must still return a renderable cart (fallback)."""
    r = requests.post(CART_URL, json={"recommendation": {}, "property": {}}, timeout=90)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert isinstance(data.get("packages"), list) and len(data["packages"]) == 3
