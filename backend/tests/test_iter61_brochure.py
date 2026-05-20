"""Iter61 backend tests:
- POST /api/invest/parse-brochure (new endpoint, off-plan PDF brochure)
- Regression: /api/invest/parse-text, /api/invest/parse-screenshot
- Regression: /api/sources/{id}, /api/location/analyze, /api/dashboard/news, /api/dashboard/competition
"""
import base64
import io
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://hospitality-ai-12.preview.emergentagent.com"


# ---------- Build a tiny valid PDF (hand-crafted) ----------
def _make_minimal_pdf(text: str) -> bytes:
    """Construct a minimal single-page PDF containing the given ASCII text."""
    # Escape parentheses + backslashes in PDF strings.
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 50 750 Td ({safe}) Tj ET".encode("latin-1")
    objs = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>")
    objs.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
                b"/Resources << /Font << /F1 5 0 R >> >> >>")
    objs.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, body in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + body + b"\nendobj\n")
    xref_pos = out.tell()
    out.write(f"xref\n0 {len(objs)+1}\n".encode())
    out.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(b"trailer\n")
    out.write(f"<< /Size {len(objs)+1} /Root 1 0 R >>\n".encode())
    out.write(f"startxref\n{xref_pos}\n%%EOF".encode())
    return out.getvalue()


@pytest.fixture(scope="module")
def brochure_pdf_b64():
    pdf = _make_minimal_pdf(
        "Project: Koukaki Heights - Off-Plan - Delivery 2027 - 24 units "
        "- From EUR 380,000 - Developer: Vela Estates - Athens, Greece "
        "- 2BR units 75 sqm, 3BR units 110 sqm. Pre-construction sale."
    )
    return base64.b64encode(pdf).decode("ascii")


# ---------- Health ----------
class TestHealth:
    def test_demo_property(self):
        r = requests.get(f"{BASE_URL}/api/properties/demo", timeout=15)
        assert r.status_code == 200
        assert r.json().get("property_id") == "demo-cycladic-boutique-suite"


# ---------- parse-brochure (NEW) ----------
class TestParseBrochure:
    def test_empty_body_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/invest/parse-brochure", json={"file_base64": ""}, timeout=15)
        assert r.status_code == 400, r.text

    def test_invalid_pdf_returns_422(self):
        # Bytes that decode but are not a PDF -> pypdf raises -> 400, OR
        # decode-able tiny text -> not a valid PDF header -> 400/422.
        bogus = base64.b64encode(b"not a pdf content").decode()
        r = requests.post(f"{BASE_URL}/api/invest/parse-brochure", json={"file_base64": bogus}, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_image_only_pdf_returns_422(self):
        # PDF with NO text content (image-only) - construct empty page
        pdf = _make_minimal_pdf("X")  # very tiny text - below 80 char threshold
        b64 = base64.b64encode(pdf).decode()
        r = requests.post(f"{BASE_URL}/api/invest/parse-brochure", json={"file_base64": b64}, timeout=20)
        assert r.status_code == 422, r.text
        assert "image-only" in r.text.lower() or "screenshot" in r.text.lower()

    def test_offplan_brochure_parses(self, brochure_pdf_b64):
        r = requests.post(
            f"{BASE_URL}/api/invest/parse-brochure",
            json={"file_base64": brochure_pdf_b64},
            timeout=90,
        )
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:500]}"
        data = r.json()
        # New off-plan fields exist on the response
        for k in ("is_off_plan", "completion_year", "developer_name",
                  "project_name", "price_from_eur", "price_to_eur", "unit_count"):
            assert k in data, f"missing field {k}"
        # Heuristic: AI should detect this as off-plan
        # (We accept None/True; explicit False would be a regression.)
        assert data["is_off_plan"] in (True, None), f"is_off_plan={data['is_off_plan']}"


# ---------- Regression: existing /invest/parse-* and other GET endpoints ----------
class TestRegression:
    def test_parse_text_empty(self):
        r = requests.post(f"{BASE_URL}/api/invest/parse-text", json={"listing_text": ""}, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_parse_text_valid(self):
        sample = ("Beautiful 2-bedroom apartment in Koukaki, Athens. 85 sqm. "
                  "Listed at 320,000 EUR. Energy class B. 3rd floor.")
        r = requests.post(f"{BASE_URL}/api/invest/parse-text", json={"listing_text": sample}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "city" in data or "title" in data

    def test_parse_screenshot_empty(self):
        r = requests.post(f"{BASE_URL}/api/invest/parse-screenshot",
                          json={"image_base64": ""}, timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_dashboard_news(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/news", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Endpoint returns either list or {articles: [...]}
        assert isinstance(data, (list, dict))

    def test_dashboard_competition(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/competition", timeout=30)
        assert r.status_code == 200, r.text

    def test_location_analyze(self):
        r = requests.post(
            f"{BASE_URL}/api/location/analyze",
            json={"address": "Koukaki, Athens, Greece"},
            timeout=60,
        )
        assert r.status_code == 200, r.text

    def test_sources_get(self):
        # Try a known source id pattern; accept 200/404 (data dependent).
        r = requests.get(f"{BASE_URL}/api/sources/demo", timeout=15)
        assert r.status_code in (200, 404), r.text
