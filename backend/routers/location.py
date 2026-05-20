"""Propul8 · Location router (extracted from server.py · iter59 refactor).

Routes:
  POST /api/location/analyze   — full Location Intelligence payload
  GET  /api/location/provider  — status: which geocoding provider is active
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from location_intelligence import analyze_location, LocationIntelligence


logger = logging.getLogger("location_router")

_db = None


def set_db(motor_db) -> None:
    """Wire mongo client from server.py."""
    global _db
    _db = motor_db


router = APIRouter(prefix="/api/location", tags=["location"])


class LocationAnalyzeRequest(BaseModel):
    address: Optional[str] = None
    lat: Optional[float]   = None
    lng: Optional[float]   = None


@router.post("/analyze", response_model=LocationIntelligence)
async def location_analyze(payload: LocationAnalyzeRequest):
    if not payload.address and (payload.lat is None or payload.lng is None):
        raise HTTPException(400, "Provide `address` OR both `lat` and `lng`.")
    try:
        return await analyze_location(
            address=(payload.address or None),
            lat=payload.lat,
            lng=payload.lng,
            cache_db=_db,
        )
    except ValueError as exc:
        # Geocoding miss / bad address → 400, not 502
        raise HTTPException(400, str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.error(f"location analyze failed: {exc}")
        raise HTTPException(502, "Location service temporarily unavailable")


@router.get("/provider")
async def location_provider():
    return {
        "provider": "google" if os.environ.get("GOOGLE_MAPS_API_KEY") else "openstreetmap",
        "google_configured": bool(os.environ.get("GOOGLE_MAPS_API_KEY")),
    }
