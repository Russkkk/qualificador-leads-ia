import os

from dotenv import load_dotenv

from config import get_config

load_dotenv()
config = get_config()

DATABASE_URL = config.DATABASE_URL
DEMO_KEY = config.DEMO_KEY
DEBUG_MODE = config.DEBUG_MODE
INCLUDE_TRACEBACK = config.INCLUDE_TRACEBACK
TRUST_PROXY = config.TRUST_PROXY
REQUIRE_API_KEY = config.REQUIRE_API_KEY

STRIPE_SECRET_KEY = config.STRIPE_SECRET_KEY
STRIPE_PRICE_IDS_JSON = config.STRIPE_PRICE_IDS_JSON
BILLING_WEBHOOK_SECRET = config.BILLING_WEBHOOK_SECRET

KIWIFY_ACCOUNT_ID = config.KIWIFY_ACCOUNT_ID
KIWIFY_CLIENT_SECRET = config.KIWIFY_CLIENT_SECRET
KIWIFY_API_KEY = config.KIWIFY_API_KEY
KIWIFY_WEBHOOK_TOKEN = config.KIWIFY_WEBHOOK_TOKEN

FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "")

ALLOWED_ORIGINS = [
    "https://qualificador-leads-ia.onrender.com",
    "https://leadrank.com.br",
    r"^https://.*\.onrender\.com$",
]
if DEBUG_MODE:
    ALLOWED_ORIGINS.extend([
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost",
        "http://127.0.0.1",
    ])

PLAN_CATALOG = {
    "demo": {"price_brl_month": 0, "setup_fee_brl": 0, "lead_limit_month": 30},
    "trial": {"price_brl_month": 0, "setup_fee_brl": 0, "lead_limit_month": 100},
    "starter": {"price_brl_month": 79, "setup_fee_brl": 0, "lead_limit_month": 1000},
    "pro": {"price_brl_month": 179, "setup_fee_brl": 0, "lead_limit_month": 5000},
    "vip": {"price_brl_month": 279, "setup_fee_brl": 0, "lead_limit_month": 20000},
}

DEFAULT_LIMIT = 200
DEFAULT_THRESHOLD = 0.35
MIN_LABELED_TO_TRAIN = 4
PBKDF2_ITERATIONS = 390_000
