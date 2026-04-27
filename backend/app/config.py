"""
config.py
─────────
Centralised application settings loaded from environment variables (or a .env
file in development).  Every other module imports the singleton `settings`
object rather than calling os.environ directly.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets


class Settings(BaseSettings):
    """All runtime configuration for PhishGuard UK backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "PhishGuard UK"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    DEBUG: bool = False

    # ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/phishguard"
    # Synchronous URL for Alembic migrations (uses psycopg2 not asyncpg)
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/phishguard"

    # ── Redis cache ────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    NEWS_CACHE_TTL_SECONDS: int = 300        # 5 minutes
    STATS_CACHE_TTL_SECONDS: int = 300       # 5 minutes

    # ── Auth / JWT ─────────────────────────────────────────────────────────────
    # If no valid env var or config is found, generate an unguessable runtime key
    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMAIL_VERIFY_TOKEN_EXPIRE_HOURS: int = 24

    # ── CORS ───────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]

    # ── Rate limiting ─────────────────────────────────────────────────────────
    SCAN_RATE_LIMIT: str = "20/hour"                # per authenticated user

    # ── ML model paths ────────────────────────────────────────────────────────
    MODEL_DIR: str = "../ml/models"
    XGB_MODEL_PATH: str = "../ml/models/xgb_model.pkl"
    EMAIL_MODEL_PATH: str = "../ml/models/email_model.pkl"
    TFIDF_VECTORIZER_PATH: str = "../ml/models/tfidf_vectorizer.pkl"
    SHAP_EXPLAINER_PATH: str = "../ml/models/shap_explainer.pkl"
    FEATURE_NAMES_PATH: str = "../ml/models/feature_names.json"
    LSTM_MODEL_PATH: str = "../ml/models/lstm_url_model.h5"

    # ── External APIs ─────────────────────────────────────────────────────────
    # Hacker News Algolia (no key needed)
    HN_API_BASE: str = "https://hn.algolia.com/api/v1"
    HN_SEARCH_QUERY: str = "phishing bank fraud UK"

    # NewsData.io (optional, free tier 200 req/day)
    NEWS_API_KEY: str = ""                          # leave blank to use HN only
    NEWSDATA_BASE: str = "https://newsdata.io/api/1/news"
    NEWS_KEYWORDS: str = "phishing,bank fraud,UK cyber"
    NEWS_COUNTRY: str = "gb"

    # Google Gemini (free tier)
    GEMINI_API_KEY: str = ""                        # leave blank to use Ollama
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Ollama (local, zero cost fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"

    # ip-api.com for Geo-IP (free, no key needed)
    GEO_IP_BASE: str = "http://ip-api.com/json"

    # ── Email / notification settings ─────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: EmailStr = "noreply@phishguard.uk"  # type: ignore[assignment]
    EMAILS_FROM_NAME: str = "PhishGuard UK"
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 15
    # Base URL of the React frontend — used to build deep links in emails
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set_in_production(cls, v: str, info) -> str:  # noqa: ANN001
        # `info.data` is populated with already-validated fields
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and v == "CHANGE_ME_IN_PRODUCTION_USE_SECRETS_GENERATE":
            raise ValueError("SECRET_KEY must be changed from the default in production")
        return v


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached singleton Settings instance.
    Using lru_cache means the .env file is read exactly once.
    """
    return Settings()


# Module-level singleton — import this everywhere.
settings: Settings = get_settings()