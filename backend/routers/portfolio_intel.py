"""Propul8 · Portfolio Intelligence router (iter67).

Backend AI signals + Exit Plans + Action Plans for owned assets.
Numerics are computed deterministically on the frontend (lib/portfolioIntelligence.js);
this router owns the AI-narrative layer powered by Claude Sonnet 4.5 via
emergentintegrations.
"""
from __future__ import annotations

import os
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


logger = logging.getLogger("propul8.portfolio")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api/portfolio-intel", tags=["portfolio-intel"])


# ─── Models ───────────────────────────────────────────────────────────

class OwnedAsset(BaseModel):
    title: str
    city: str
    neighborhood: Optional[str] = None
    property_type: Optional[str] = "Apartment"
    sqm: Optional[float] = None
    condition: Optional[str] = "Good"
    purchase_price_eur: float
    purchase_date: Optional[str] = None
    current_value_eur: Optional[float] = None
    valuation_source: Optional[str] = "manual"
    annual_gross_eur: Optional[float] = 0
    annual_net_eur: Optional[float] = 0
    occupancy_pct: Optional[float] = 0
    adr_eur: Optional[float] = 0
    mortgage_balance_eur: Optional[float] = 0
    management_fee_pct: Optional[float] = 0
    management_company: Optional[str] = None


class AISignalRequest(BaseModel):
    asset: Dict[str, Any]
    portfolio_summary: Optional[Dict[str, Any]] = None


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/asset")
async def create_owned_asset(payload: OwnedAsset):
    """Create an owned asset in the cockpit."""
    doc = payload.model_dump()
    doc["id"] = f"owned_{uuid.uuid4().hex[:10]}"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["demo"] = False
    await _db.owned_assets.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/owned")
async def list_owned_assets():
    """Return all owned assets for the cockpit (single-user demo)."""
    docs = await _db.owned_assets.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"assets": docs}


@router.put("/asset/{asset_id}/valuation")
async def update_valuation(asset_id: str, payload: Dict[str, Any]):
    """Owner-driven valuation override. Frontend recomputes derived numbers
    locally; we just persist the new value + confidence + timestamp."""
    new_value = payload.get("current_value_eur")
    if not new_value or new_value <= 0:
        raise HTTPException(400, "current_value_eur is required and must be > 0")
    src = (payload.get("valuation_source") or "manual").lower()
    update = {
        "current_value_eur":     float(new_value),
        "valuation_source":      src,
        "valuation_updated_at":  datetime.now(timezone.utc).isoformat()[:10],
    }
    res = await _db.owned_assets.update_one({"id": asset_id}, {"$set": update})
    if res.matched_count == 0:
        # Allow updates on the synthetic demo set — frontend handles
        # the override locally; just return the payload back.
        return {"id": asset_id, **update, "is_demo_override": True}
    return {"id": asset_id, **update}


@router.post("/signal")
async def ai_asset_signal(payload: AISignalRequest):
    """Generate the short AI Signal text that sits on top of each asset card.

    Single sentence per Bloomberg-style asset cockpit norms — never an essay.
    """
    asset = payload.asset or {}
    text = await _claude(
        system=(
            "You are Propul8's Portfolio Intelligence layer. "
            "Return ONE single signal sentence (max 22 words) for the asset's "
            "current state. Format: '{Action}. {Concise institutional reason}.'\n"
            "Action MUST be one of: Hold, Sell, Refinance, Renovate, Optimize, Watch.\n"
            "Tone: institutional, decisive, hospitality-fluent.\n"
            "No fluff. No headlines. No quotes. Just the sentence."
        ),
        prompt=_format_asset_for_signal(asset, payload.portfolio_summary),
        max_chars=180,
        fallback=_deterministic_signal(asset),
    )
    return {"signal": text, "generated_at": datetime.now(timezone.utc).isoformat()}


class ExitPlanRequest(BaseModel):
    asset: Dict[str, Any]
    target_timeline_days: int = 90


@router.post("/exit-plan")
async def ai_exit_plan(payload: ExitPlanRequest):
    """Generate a structured exit plan from Claude Sonnet 4.5."""
    asset = payload.asset or {}
    days = max(30, min(365, payload.target_timeline_days))

    system = (
        "You are Propul8's Exit Plan engine. Return a single VALID JSON object "
        "(no prose, no markdown fences) with this exact schema:\n\n"
        "{\n"
        "  \"recommended_listing_price_eur\": int,\n"
        "  \"realistic_offer_low_eur\":  int,\n"
        "  \"realistic_offer_high_eur\": int,\n"
        "  \"target_buyer_profile\": str (<= 22 words),\n"
        "  \"documents_to_prepare\": [str x 3-5],\n"
        "  \"design_improvements\":  [str x 2-4],\n"
        "  \"income_proof\":         [str x 2-4],\n"
        "  \"best_selling_angle\":   str (<= 22 words),\n"
        "  \"furnished_recommendation\": str (<= 14 words; 'Sell furnished' or 'Sell unfurnished' + reason),\n"
        "  \"expected_timeline_days\": int,\n"
        "  \"final_recommendation\": str (<= 28 words)\n"
        "}\n\n"
        "Numbers must be internally consistent: listing >= offer_high >= offer_low. "
        "Tone: institutional, hospitality-fluent, decisive. Greek-market aware."
    )
    user = (
        f"Asset: {asset.get('title')} in {asset.get('city')}, {asset.get('neighborhood') or '—'}\n"
        f"Type: {asset.get('property_type')} | {asset.get('sqm')} sqm | condition: {asset.get('condition')}\n"
        f"Bought: €{int(asset.get('purchase_price_eur') or 0):,} on {asset.get('purchase_date')}\n"
        f"Current value: €{int(asset.get('current_value_eur') or 0):,}\n"
        f"Annual gross: €{int(asset.get('annual_gross_eur') or 0):,}\n"
        f"Annual net:   €{int(asset.get('annual_net_eur') or 0):,}\n"
        f"Occupancy: {asset.get('occupancy_pct')}% | ADR: €{asset.get('adr_eur')}\n"
        f"Mortgage balance: €{int(asset.get('mortgage_balance_eur') or 0):,}\n"
        f"Mgmt fee: {asset.get('management_fee_pct')}%\n"
        f"Target exit timeline: {days} days\n\n"
        "Return the JSON object now."
    )
    fallback = _deterministic_exit_plan(asset, days)
    raw = await _claude(system=system, prompt=user, max_chars=2200, fallback=None)
    if not raw:
        return {"plan": fallback, "source": "deterministic-fallback"}
    try:
        plan = _parse_json(raw)
    except Exception as exc:
        logger.warning(f"exit-plan JSON parse failed: {exc}")
        return {"plan": fallback, "source": "deterministic-fallback"}
    return {"plan": plan, "source": "claude-sonnet-4-5"}


class ActionPlanRequest(BaseModel):
    asset: Dict[str, Any]


class NegotiationPackRequest(BaseModel):
    asset: Dict[str, Any]
    verdict: Dict[str, Any]
    asking_price_eur: Optional[float] = 0
    snapshot: Optional[Dict[str, Any]] = None


class PipelineSaveRequest(BaseModel):
    asset: Dict[str, Any]
    verdict: Optional[Dict[str, Any]] = None
    asking_price_eur: Optional[float] = 0
    asset_id: Optional[str] = None


@router.post("/negotiation-pack")
async def negotiation_pack(payload: NegotiationPackRequest):
    """Return a structured pack the buyer can take into the seller conversation.

    Contains: comparable sales (3) · yield sensitivity table (3) · seller-side
    leverage points (3). Comparable sales + sensitivity are deterministic so
    the numbers always reconcile with the verdict above; the leverage points
    come from Claude when available, deterministic otherwise.
    """
    asset      = payload.asset or {}
    verdict    = payload.verdict or {}
    asking     = float(payload.asking_price_eur or 0)
    target     = float(verdict.get("target_offer_eur")     or asking * 0.94)
    aggressive = float(verdict.get("aggressive_offer_eur") or asking * 0.88)

    city = (asset.get("city") or "Athens").split(",")[0].strip()
    sqm  = float(asset.get("m2") or asset.get("sqm") or 75)

    # Synthesised but deterministic — 3 anonymised comps within ±8% of asking.
    comps = [
        {"address": f"{city} · {city[:3].upper()}-A14",  "price": f"€{int(asking * 0.93):,}", "sqm": int(sqm),     "price_per_sqm_eur": int((asking * 0.93) / sqm)},
        {"address": f"{city} · {city[:3].upper()}-B22",  "price": f"€{int(asking * 0.96):,}", "sqm": int(sqm + 5), "price_per_sqm_eur": int((asking * 0.96) / (sqm + 5))},
        {"address": f"{city} · {city[:3].upper()}-C07",  "price": f"€{int(asking * 1.05):,}", "sqm": int(sqm - 4), "price_per_sqm_eur": int((asking * 1.05) / max(1, sqm - 4))},
    ]

    sensitivity = [
        {"scenario": "ADR -10%",          "yield_pct": round((verdict.get("projected_post_vela_yield_pct") or 6.5) * 0.86, 1)},
        {"scenario": "Base case",         "yield_pct": round((verdict.get("projected_post_vela_yield_pct") or 6.5),       1)},
        {"scenario": "ADR +10%",          "yield_pct": round((verdict.get("projected_post_vela_yield_pct") or 6.5) * 1.13, 1)},
    ]

    # Leverage points — Claude with deterministic fallback.
    leverage_default = [
        f"Comparable sales support a price of €{int(asking * 0.93):,} — anchor the seller to the realistic comp set, not the aspirational list price.",
        f"At asking, the yield is {(verdict.get('projected_post_vela_yield_pct') or 6.5):.1f}% — below the institutional 6.5% floor; cite this directly.",
        "Renovation cost + 90-day Propul8 uplift program are the buyer's risk; the seller should fund part via price concession.",
    ]
    raw = await _claude(
        system=(
            "You are Propul8's Negotiation Pack engine. Return ONLY a JSON array of "
            "EXACTLY 3 short, institutional, seller-side leverage points (max 28 words each). "
            "No prose, no markdown fences, just the array."
        ),
        prompt=(
            f"Asset: {asset.get('title') or 'Subject asset'} in {city}\n"
            f"Asking: €{int(asking):,} | Smart-buy target: €{int(target):,} | Aggressive: €{int(aggressive):,}\n"
            f"Projected yield: {(verdict.get('projected_post_vela_yield_pct') or 6.5):.1f}%\n"
            "Return the JSON array of 3 leverage points now."
        ),
        max_chars=900,
        fallback=None,
    )
    leverage = leverage_default
    if raw:
        try:
            parsed = _parse_json(raw if raw.lstrip().startswith("[") else f"{{\"items\":{raw}}}")
            if isinstance(parsed, list):
                leverage = parsed[:3]
            elif isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
                leverage = parsed["items"][:3]
        except Exception:
            pass

    return {"pack": {
        "asking_price_eur":      int(asking),
        "smart_buy_target_eur":  int(target),
        "aggressive_offer_eur":  int(aggressive),
        "comparable_sales":      comps,
        "yield_sensitivity":     sensitivity,
        "leverage_points":       leverage,
        "generated_at":          datetime.now(timezone.utc).isoformat(),
    }}


@router.post("/pipeline")
async def save_to_pipeline(payload: PipelineSaveRequest):
    """Save an analyzed acquisition to the buyer's pipeline (multi-state)."""
    asset   = payload.asset or {}
    verdict = payload.verdict or {}
    doc = {
        "pipeline_id": f"pipe_{uuid.uuid4().hex[:10]}",
        "asset_id":    payload.asset_id,
        "title":       asset.get("title") or "Untitled asset",
        "city":        asset.get("city"),
        "neighborhood": asset.get("neighborhood"),
        "asking_price_eur":     float(payload.asking_price_eur or 0),
        "smart_buy_target_eur": float(verdict.get("target_offer_eur")     or 0),
        "aggressive_offer_eur": float(verdict.get("aggressive_offer_eur") or 0),
        "verdict":         verdict.get("verdict") or "WATCH",
        "propul8_score":   verdict.get("propul8_score") or verdict.get("score"),
        "yield_pct":       verdict.get("projected_post_vela_yield_pct"),
        "status":          "In Negotiation" if verdict.get("verdict") == "NEGOTIATE" else "Evaluating",
        "added_at":        datetime.now(timezone.utc).isoformat(),
    }
    await _db.pipeline_assets.insert_one(doc)
    doc.pop("_id", None)
    return {"saved": doc}


@router.get("/pipeline")
async def list_pipeline():
    docs = await _db.pipeline_assets.find({}, {"_id": 0}).sort("added_at", -1).to_list(50)
    return {"items": docs}


@router.post("/action-plan")
async def ai_action_plan(payload: ActionPlanRequest):
    """Generate the 5-step action plan shown on the Action Plan tab."""
    asset = payload.asset or {}

    system = (
        "You are Propul8's Action Plan engine. Return a single VALID JSON object:\n"
        "{ \"steps\": [{\"n\": 1, \"title\": str (<=12 words), \"detail\": str (<=30 words)}, ... 5 items] }\n"
        "Steps must be specific, ordered, executable in 30-90 days, and hospitality-fluent. "
        "No fluff. No generic SaaS phrasing. Each step must reference the asset's actual market and metrics."
    )
    user = (
        f"Asset: {asset.get('title')} in {asset.get('city')}\n"
        f"Purchase €{int(asset.get('purchase_price_eur') or 0):,} → current €{int(asset.get('current_value_eur') or 0):,}\n"
        f"Annual net €{int(asset.get('annual_net_eur') or 0):,} | occupancy {asset.get('occupancy_pct')}% | ADR €{asset.get('adr_eur')}\n"
        "Return the JSON now."
    )

    fallback = {"steps": _deterministic_action_steps(asset)}
    raw = await _claude(system=system, prompt=user, max_chars=1400, fallback=None)
    if not raw:
        return {"plan": fallback, "source": "deterministic-fallback"}
    try:
        plan = _parse_json(raw)
        if "steps" not in plan or not isinstance(plan["steps"], list):
            raise ValueError("missing steps")
    except Exception as exc:
        logger.warning(f"action-plan JSON parse failed: {exc}")
        return {"plan": fallback, "source": "deterministic-fallback"}
    return {"plan": plan, "source": "claude-sonnet-4-5"}


class PortfolioAISignalRequest(BaseModel):
    summary: Dict[str, Any]
    top_asset_name: Optional[str] = None


@router.post("/portfolio-signal")
async def ai_portfolio_signal(payload: PortfolioAISignalRequest):
    """Top-of-page portfolio AI signal — one sentence."""
    s = payload.summary or {}
    text = await _claude(
        system=(
            "You are Propul8's Portfolio Intelligence layer. Return ONE single "
            "institutional-grade signal sentence (max 28 words). Format: "
            "'AI Signal: <observation>. <decisive action>.' No fluff."
        ),
        prompt=(
            f"Assets: {s.get('asset_count')}\n"
            f"Purchase total: €{int(s.get('purchase_total') or 0):,}\n"
            f"Current total:  €{int(s.get('current_total') or 0):,}\n"
            f"Equity total:   €{int(s.get('equity_total') or 0):,} ({s.get('equity_pct')}%)\n"
            f"Annual net:     €{int(s.get('annual_net') or 0):,}\n"
            f"Yield on cost:  {s.get('yield_on_cost_pct')}%\n"
            f"Yield on now:   {s.get('yield_on_now_pct')}%\n"
            f"Portfolio score:{s.get('portfolio_score')}\n"
            f"Liquidity:      {s.get('portfolio_liquidity')}\n"
            f"Top asset: {payload.top_asset_name or '—'}\n"
            "Return the signal sentence now."
        ),
        max_chars=220,
        fallback=_deterministic_portfolio_signal(s, payload.top_asset_name),
    )
    return {"signal": text, "generated_at": datetime.now(timezone.utc).isoformat()}


# ─── Claude wrapper + deterministic fallbacks ─────────────────────────

async def _claude(system: str, prompt: str, max_chars: int, fallback: Optional[str]) -> Optional[str]:
    """Call Claude Sonnet 4.5; on failure return the deterministic fallback."""
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: WPS433
    except Exception:
        return fallback
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"portfolio-intel-{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        raw = await chat.send_message(UserMessage(text=prompt))
        text = str(raw).strip()
        if not text:
            return fallback
        if len(text) > max_chars:
            text = text[:max_chars].rstrip()
        return text
    except Exception as exc:
        logger.warning(f"Claude call failed: {exc}")
        return fallback


def _parse_json(raw: str) -> Dict[str, Any]:
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1]
        if s.startswith("json"):
            s = s[4:]
        s = s.strip("` \n")
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        l = s.find("{"); r = s.rfind("}")
        if l >= 0 and r > l:
            return json.loads(s[l : r + 1])
        raise


def _format_asset_for_signal(asset: Dict[str, Any], summary: Optional[Dict[str, Any]]) -> str:
    parts = [
        f"Asset: {asset.get('title')} in {asset.get('city')}",
        f"Purchase €{int(asset.get('purchase_price_eur') or 0):,}",
        f"Current  €{int(asset.get('current_value_eur') or 0):,}",
        f"Annual net €{int(asset.get('annual_net_eur') or 0):,}",
        f"Occupancy {asset.get('occupancy_pct')}%",
        f"ADR €{asset.get('adr_eur')}",
        f"Condition {asset.get('condition')}",
    ]
    return "\n".join(parts) + "\n\nReturn the signal sentence now."


def _deterministic_signal(asset: Dict[str, Any]) -> str:
    purch = asset.get("purchase_price_eur") or 0
    cur   = asset.get("current_value_eur")  or 0
    yoc   = ((asset.get("annual_gross_eur") or 0) / purch * 100) if purch else 0
    sale_floor = int(cur * 1.025)
    if yoc >= 7 and cur > purch:
        return f"Hold. Strong {round(yoc, 1)}% yield on cost and growing equity. Sell only above €{sale_floor:,}."
    if cur < purch:
        return f"Hold. Below entry — wait for recovery or optimise occupancy before any exit."
    return f"Watch. Modest yield; reassess after one full season of rental performance data."


def _deterministic_portfolio_signal(s: Dict[str, Any], top: Optional[str]) -> str:
    pct = s.get("equity_pct") or 0
    if pct >= 8:
        return f"AI Signal: Your portfolio is up {pct}% from purchase value. Best action: hold income-producing assets unless exit prices exceed current valuation by 5–8%."
    return f"AI Signal: Portfolio appreciation modest at {pct}%. Focus on yield optimisation before exits — improve photography, pricing calendar, and channel coverage."


def _deterministic_exit_plan(asset: Dict[str, Any], days: int) -> Dict[str, Any]:
    cur = asset.get("current_value_eur") or 0
    return {
        "recommended_listing_price_eur": int(cur * 1.045),
        "realistic_offer_low_eur":       int(cur * 0.97),
        "realistic_offer_high_eur":      int(cur * 1.015),
        "target_buyer_profile":          "Foreign investor seeking turnkey Athens income-producing asset with metro + landmark access.",
        "documents_to_prepare": [
            "Original purchase contract",
            "STR / Airbnb income statements (24 months)",
            "Occupancy calendar export",
            "Up-to-date title and tax certificates",
            "Furnishing + renovation invoices",
        ],
        "design_improvements": [
            "Editorial photography refresh (golden-hour set)",
            "Listing copy + amenity restyling",
            "Programmed 2700K evening lighting layer",
        ],
        "income_proof": [
            "Trailing-12-month gross income table",
            "Occupancy + ADR seasonality chart",
            "Net-of-management-fees summary",
        ],
        "best_selling_angle": "Turnkey STR with proven income, Acropolis access, and renovated finish — ready for institutional flip.",
        "furnished_recommendation": "Sell furnished — institutional buyers value plug-and-play income streams.",
        "expected_timeline_days": days,
        "final_recommendation": "List at the high end and accept anything above the realistic-offer floor; do not chase below.",
    }


def _deterministic_action_steps(asset: Dict[str, Any]) -> List[Dict[str, Any]]:
    cur = asset.get("current_value_eur") or 0
    return [
        {"n": 1, "title": "Refresh editorial photography",
         "detail": "Re-shoot the listing at golden hour with a real estate photographer; refresh the cover image first."},
        {"n": 2, "title": "Prepare STR income report",
         "detail": "Export trailing 12-month gross + net income with monthly occupancy from your channel manager."},
        {"n": 3, "title": "Get broker valuation range",
         "detail": "Solicit a written valuation from a local broker familiar with foreign-investor STR demand."},
        {"n": 4, "title": "List only above floor",
         "detail": f"List the asset only if the broker supports €{int(cur * 1.025):,}+; otherwise hold and optimise."},
        {"n": 5, "title": "Optimise ADR by 10–15%",
         "detail": "Implement dynamic pricing, programmed evening lighting, and an outdoor programming layer to lift ADR."},
    ]
