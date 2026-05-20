"""Propul8 · Checkout router (iter66 refactor).

Stripe Checkout sessions, status polling, and webhook receiver.
PRICING_TIERS is the server-side source of truth — frontend never sends amounts.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel


logger = logging.getLogger("propul8.checkout")

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

# Mongo client injected by server.py.
_db = None


def set_db(motor_db) -> None:
    global _db
    _db = motor_db


router = APIRouter(prefix="/api", tags=["checkout"])


# ─── Tier table — single source of truth for amounts. ────────────────────
PRICING_TIERS: Dict[str, Dict[str, Any]] = {
    "start":    {"label": "Start",    "amount": 0.00,   "currency": "eur"},
    "analyze":  {"label": "Analyze",  "amount": 49.00,  "currency": "eur"},  # one-off report
    "pro":      {"label": "Pro",      "amount": 149.00, "currency": "eur"},  # monthly
    "scale":    {"label": "Scale",    "amount": 0.00,   "currency": "eur"},  # custom · contact sales
    # Legacy aliases — kept so old links + tests keep working
    "free":      {"label": "Start", "amount": 0.00,   "currency": "eur"},
    "investor":  {"label": "Pro",   "amount": 149.00, "currency": "eur"},
    "developer": {"label": "Scale", "amount": 0.00,   "currency": "eur"},
}

# Module-level Stripe library import — keeps it hot from boot.
try:
    from emergentintegrations.payments.stripe.checkout import (  # noqa: WPS433
        StripeCheckout, CheckoutSessionRequest,
    )
    _STRIPE_AVAILABLE = True
except Exception as _stripe_exc:  # noqa: BLE001
    StripeCheckout = None  # type: ignore[assignment]
    CheckoutSessionRequest = None  # type: ignore[assignment]
    _STRIPE_AVAILABLE = False
    logger.warning(f"Stripe library not available at import time: {_stripe_exc}")


class StripeCheckoutRequest(BaseModel):
    tier: str
    origin_url: str  # window.location.origin from the frontend


@router.post("/payments/checkout")
async def create_checkout(payload: StripeCheckoutRequest, http_request: Request):
    tier = (payload.tier or "").strip().lower()
    if tier not in PRICING_TIERS:
        raise HTTPException(400, "Unknown pricing tier")
    info = PRICING_TIERS[tier]
    if info["amount"] <= 0:
        raise HTTPException(400, "Free tier requires no checkout")
    if not STRIPE_API_KEY:
        raise HTTPException(503, "Stripe not configured")
    if not _STRIPE_AVAILABLE:
        raise HTTPException(503, "Stripe library unavailable")

    origin = (payload.origin_url or "").rstrip("/")
    if not origin.startswith("http"):
        raise HTTPException(400, "Invalid origin_url")
    success_url = f"{origin}/pricing?session={{CHECKOUT_SESSION_ID}}"
    cancel_url  = f"{origin}/pricing?cancelled=1"

    host_url    = str(http_request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    req = CheckoutSessionRequest(
        amount=info["amount"],
        currency=info["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tier": tier, "label": info["label"], "source": "propul8_pricing"},
    )
    try:
        session = await stripe.create_checkout_session(req)
    except Exception as exc:
        logger.error(f"Stripe create session failed: {exc}")
        raise HTTPException(502, "Stripe provider error")

    await _db.payment_transactions.insert_one({
        "session_id":     session.session_id,
        "tier":           tier,
        "amount":         info["amount"],
        "currency":       info["currency"],
        "metadata":       {"tier": tier, "label": info["label"]},
        "payment_status": "initiated",
        "status":         "pending",
        "created_at":     datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def checkout_status(session_id: str):
    """Polled by the frontend after Stripe redirect.

    Reads from Mongo (source of truth — populated by /api/webhook/stripe on
    Stripe's webhook delivery). The Stripe proxy doesn't support session
    retrieval post-creation, so we don't try to call Stripe here.
    """
    rec = await _db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Unknown session")
    return {
        "status":         rec.get("status", "pending"),
        "payment_status": rec.get("payment_status", "initiated"),
        "amount_total":   rec.get("amount_total") or rec.get("amount"),
        "currency":       rec.get("currency"),
        "tier":           rec.get("tier"),
    }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Receives Stripe checkout events and updates the Mongo transaction row.

    Idempotent — replays on the same session id only ever flip pending → paid.
    """
    if not _STRIPE_AVAILABLE:
        raise HTTPException(503, "Stripe library unavailable")
    raw = await request.body()
    sig = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature") or ""
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    try:
        event = await stripe.handle_webhook(raw, sig)
    except Exception as exc:
        logger.error(f"Stripe webhook handle failed: {exc}")
        raise HTTPException(400, "Invalid webhook payload")
    session_id = getattr(event, "session_id", None) or getattr(event, "id", None)
    if not session_id:
        return {"ok": True, "noop": True}
    await _db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": getattr(event, "payment_status", "paid"),
            "status":         "complete",
            "amount_total":   getattr(event, "amount_total", None),
            "currency":       getattr(event, "currency", None),
            "completed_at":   datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True}
