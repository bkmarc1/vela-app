"""Propul8 · Source Ledger router (extracted from server.py · iter59).

Per-listing per-field lock state — used by the Source Ledger v2 UI on both
Invest and Operate. Idempotent upsert on (asset_id, field) composite key.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api/sources", tags=["sources"])


class SourceLockRequest(BaseModel):
    field: str
    value: Optional[Any] = None
    locked_by: Optional[str] = None


@router.get("/{asset_id}")
async def sources_get(asset_id: str):
    if not asset_id:
        raise HTTPException(400, "asset_id required")
    cursor = _db["source_locks"].find({"asset_id": asset_id}, {"_id": 0})
    docs = []
    async for d in cursor:
        if isinstance(d.get("locked_at"), datetime):
            d["locked_at"] = d["locked_at"].isoformat()
        docs.append(d)
    return {"asset_id": asset_id, "locks": docs}


@router.post("/{asset_id}/lock")
async def sources_lock(asset_id: str, payload: SourceLockRequest):
    if not asset_id or not payload.field:
        raise HTTPException(400, "asset_id and field required")
    now = datetime.now(timezone.utc)
    doc = {
        "asset_id": asset_id,
        "field": payload.field,
        "value": payload.value,
        "locked_at": now,
        "locked_by": payload.locked_by or "demo",
    }
    await _db["source_locks"].update_one(
        {"asset_id": asset_id, "field": payload.field},
        {"$set": doc},
        upsert=True,
    )
    out = dict(doc)
    out["locked_at"] = now.isoformat()
    return out


@router.post("/{asset_id}/unlock")
async def sources_unlock(asset_id: str, payload: SourceLockRequest):
    if not asset_id or not payload.field:
        raise HTTPException(400, "asset_id and field required")
    await _db["source_locks"].delete_one(
        {"asset_id": asset_id, "field": payload.field},
    )
    return {"asset_id": asset_id, "field": payload.field, "locked": False}
