from flask import Blueprint

from extensions import limiter
from services import settings
from services.db import ensure_schema_once
from services.utils import iso, json_ok, now_utc

core_bp = Blueprint("core", __name__)


@core_bp.get("/")
@limiter.limit("100 per minute")
def root():
    return json_ok({"service": "LeadRank backend", "ts": iso(now_utc())})


@core_bp.get("/health")
@limiter.limit("100 per minute")
def health():
    return json_ok({"ts": iso(now_utc())})


@core_bp.get("/health_db")
@limiter.limit("100 per minute")
def health_db():
    if not settings.DATABASE_URL:
        return json_ok({"db": False, "error": "DATABASE_URL missing", "ts": iso(now_utc())})
    ok, err = ensure_schema_once()
    return json_ok({"db": ok, "error": err, "ts": iso(now_utc())})


@core_bp.get("/pricing")
@limiter.limit("100 per minute")
def pricing():
    return json_ok(
        {
            "plans": settings.PLAN_CATALOG,
            "currency": "BRL",
            "checkout_enabled": bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PRICE_IDS_JSON),
            "ts": iso(now_utc()),
        }
    )
