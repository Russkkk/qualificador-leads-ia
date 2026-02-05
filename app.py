import logging
import os

from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from blueprints.admin import admin_bp
from blueprints.auth import auth_bp
from blueprints.billing import billing_bp
from blueprints.core import core_bp
from blueprints.leads import leads_bp
from blueprints.ml import ml_bp
from extensions import limiter, login_manager
from services import settings
from services.auth_service import load_user
from services.db import ensure_schema_once
from services.utils import json_err, log_exception


app = Flask(__name__)
app.secret_key = settings.FLASK_SECRET_KEY or "dev-secret"

CORS(app, resources={r"/*": {"origins": settings.ALLOWED_ORIGINS}})
log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO)
logging.basicConfig(level=log_level)

limiter.init_app(app)
login_manager.init_app(app)


@login_manager.user_loader
def load_user_callback(user_id: str):
    return load_user(user_id)


@app.errorhandler(Exception)
def handle_exception(err: Exception):
    if isinstance(err, HTTPException):
        return json_err(
            err.description,
            err.code or 500,
            error_code="http_error",
            error_type=err.__class__.__name__,
        )
    trace = log_exception("Unhandled exception")
    payload = {
        "error_code": "internal_error",
        "code": "internal_error",
        "error_type": err.__class__.__name__,
    }
    if settings.DEBUG_MODE or settings.INCLUDE_TRACEBACK:
        payload["trace"] = trace
    return json_err("Erro interno do servidor", 500, **payload)


app.register_blueprint(core_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(leads_bp)
app.register_blueprint(ml_bp)
app.register_blueprint(billing_bp)
app.register_blueprint(admin_bp)


try:
    ensure_schema_once()
except Exception:
    pass
