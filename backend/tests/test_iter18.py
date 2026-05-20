"""Iter18 — dedupe (canonical url), persistence, regression."""
import os, re, sys
import requests, pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hospitality-ai-12.preview.emergentagent.com').rstrip('/')

# Import the canonical helper directly for unit-level testing
sys.path.insert(0, '/app/backend')
from server import _canonical_listing_url  # noqa: E402


class TestCanonicalUrl:
    def test_strips_query(self):
        assert _canonical_listing_url('https://airbnb.com/rooms/1?ref=foo') == 'https://airbnb.com/rooms/1'

    def test_strips_trailing_slash(self):
        assert _canonical_listing_url('https://airbnb.com/rooms/1/') == 'https://airbnb.com/rooms/1'

    def test_lowercases(self):
        assert _canonical_listing_url('HTTPS://AirBnB.com/Rooms/1') == 'https://airbnb.com/rooms/1'

    def test_strips_fragment(self):
        assert _canonical_listing_url('https://airbnb.com/rooms/1#photos') == 'https://airbnb.com/rooms/1'

    def test_three_variants_collapse_same(self):
        a = _canonical_listing_url('https://airbnb.com/rooms/1?ref=foo')
        b = _canonical_listing_url('https://airbnb.com/rooms/1/')
        c = _canonical_listing_url('https://airbnb.com/rooms/1#photos')
        assert a == b == c == 'https://airbnb.com/rooms/1'

    def test_empty_returns_empty(self):
        assert _canonical_listing_url('') == ''
        assert _canonical_listing_url(None) == ''


class TestPropertiesAuthGated:
    def test_post_requires_auth(self):
        r = requests.post(f'{BASE_URL}/api/properties', json={'name': 'x', 'city': 'y'})
        assert r.status_code in (401, 403)


class TestPublicRegression:
    def test_demo_property(self):
        r = requests.get(f'{BASE_URL}/api/properties/demo')
        assert r.status_code == 200
        d = r.json()
        assert d['property_id'] == 'demo-cycladic-boutique-suite'
        assert 'analysis' in d

    def test_portfolio_demo_5(self):
        r = requests.get(f'{BASE_URL}/api/portfolio/demo')
        assert r.status_code == 200
        d = r.json()
        assert len(d['properties']) == 5

    def test_visualize_post(self):
        r = requests.post(f'{BASE_URL}/api/visualize', json={
            'recommendation': {'title': 'Sleep Capacity Expansion', 'transformation': '4 → 5 Guests'},
            'property': {'name': 'Cycladic', 'city': 'Koufonisia', 'property_type': 'Suite', 'sqm': 78, 'sleeps': 4, 'nightly_rate': 145},
        }, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert len(d['concepts']) == 3
        keys = [c['key'] for c in d['concepts']]
        assert keys == ['mezzanine_loft', 'convertible_living', 'bunk_millwork']

    def test_upgrade_cart(self):
        r = requests.post(f'{BASE_URL}/api/upgrade/cart', json={
            'recommendation': {'title': 'Editorial Photography Refresh'},
            'property': {'city': 'Koufonisia', 'property_type': 'Suite'},
        }, timeout=60)
        assert r.status_code == 200

    def test_upgrade_listing(self):
        r = requests.post(f'{BASE_URL}/api/upgrade/listing', json={
            'recommendation': {'title': 'Editorial Photography Refresh'},
            'property': {'name': 'Cycladic', 'city': 'Koufonisia', 'property_type': 'Suite', 'sqm': 78, 'sleeps': 4, 'nightly_rate': 145},
        }, timeout=60)
        assert r.status_code == 200

    def test_ingest_listing_url(self):
        r = requests.post(f'{BASE_URL}/api/ingest/listing-url', json={
            'url': 'https://www.airbnb.com/rooms/12345',
        }, timeout=120)
        assert r.status_code == 200
        d = r.json()
        # Should return images + visual_analysis as per Iter14
        assert 'images' in d or 'photos' in d or 'visual_analysis' in d
