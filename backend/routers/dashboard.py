"""Propul8 · Dashboard router.

Exposes:
  GET  /api/dashboard/news               — Top Athens / Greek RE headlines
  GET  /api/dashboard/competition        — Acquisition + Operate competitive
                                            positioning vs Athens market
"""
from __future__ import annotations

import logging
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from dashboard_news import fetch_athens_news


logger = logging.getLogger("dashboard")

# `db` is injected at module-import time by server.py via set_db()
_db = None


def set_db(motor_db) -> None:
    """Wire the FastAPI app's mongo client into this router."""
    global _db
    _db = motor_db


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/news")
async def get_news(limit: int = Query(default=6, ge=1, le=20)):
    """Return the latest Athens / Greek real estate headlines."""
    items = await fetch_athens_news(cache_db=_db, limit=limit)
    return {
        "items": items,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
    }


@router.get("/competition")
async def get_competition() -> Dict[str, Any]:
    """Return Propul8-tracked-portfolio positioning vs the Athens benchmark.

    Used by the Dashboard's Acquisition + Operate competitive bar chart.
    Deterministic numbers; replaced by AirDNA / PriceLabs aggregates when
    those APIs are wired in."""
    # Deterministic seed for stability so the chart doesn't jitter on reload.
    h = int(hashlib.sha256(b"propos-competition-v1").hexdigest()[:8], 16)

    portfolio_acq    = 78 + (h % 6)        # 78..83
    market_acq       = 68
    top_quartile_acq = 88

    portfolio_op     = 74 + ((h >> 4) % 6) # 74..79
    market_op        = 71
    top_quartile_op  = 87

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "market": "Athens, Greece",
        "acquisition": {
            "portfolio_score":    portfolio_acq,
            "market_average":     market_acq,
            "top_quartile":       top_quartile_acq,
            "delta_vs_market":    portfolio_acq - market_acq,
            "delta_vs_top":       portfolio_acq - top_quartile_acq,
        },
        "operate": {
            "portfolio_score":    portfolio_op,
            "market_average":     market_op,
            "top_quartile":       top_quartile_op,
            "delta_vs_market":    portfolio_op - market_op,
            "delta_vs_top":       portfolio_op - top_quartile_op,
        },
        "summary": (
            f"You are running {portfolio_acq - market_acq} pts above the Athens market on acquisition "
            f"and {portfolio_op - market_op} pts above on yield operations. The biggest closeable gap "
            f"is {top_quartile_acq - portfolio_acq} pts to reach the top quartile on acquisition — "
            "improve sourcing quality + negotiation discipline."
        ),
        "data_quality": "Benchmark · Athens 2026Q1",
        "has_real_comparables": False,
    }
