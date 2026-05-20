"""Propul8 · Auth router (iter66 refactor).

Owns the Emergent-managed Google OAuth session exchange + cookie-based auth.
Exports User model + get_current_user / require_user dependencies so other
routers (invest, operate, properties, checkout) can require auth.
"""
from __future__ import annotations

import os
import uuid
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel


logger = logging.getLogger("propul8.auth")

EMERGENT_AUTH_SESSION_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

# Mongo client is injected by server.py via set_db() at import time.
_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api", tags=["auth"])


# ─── Models ──────────────────────────────────────────────────────────────
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


# ─── Dependencies ────────────────────────────────────────────────────────
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> Optional[User]:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    sess = await _db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await _db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        return None
    return User(**user)


async def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(401, "Authentication required")
    return user


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.post("/auth/session")
async def auth_session(payload: Dict[str, Any], response: Response):
    """Exchange Emergent session_id for our session_token cookie."""
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")
    r = requests.get(
        EMERGENT_AUTH_SESSION_URL,
        headers={"X-Session-ID": session_id},
        timeout=20,
    )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture", "")
    session_token = data.get("session_token") or data.get("session_id")

    existing = await _db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await _db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await _db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await _db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
    }


@router.get("/auth/me")
async def auth_me(user: User = Depends(require_user)):
    return user.model_dump()


@router.post("/auth/logout")
async def auth_logout(
    response: Response,
    session_token: Optional[str] = Cookie(default=None),
):
    if session_token:
        await _db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
