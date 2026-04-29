"""
main.py
───────
FastAPI application factory for PhishGuard UK.

Startup sequence (lifespan):
  1. Configure structured logging.
  2. Load ML models into memory (XGBoost + SHAP + email model).
  3. Register all routers under /api prefix.
  4. Attach the slowapi rate-limiter and CORS middleware.

Run in development:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Run in production:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
"""

import logging
import logging.config
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.routers import auth, history, news, scan, stats, support, ai, extension
from app.services.email_service import load_email_model
from app.services.ml_service import load_models
from app.services import intel_service
from app.database import AsyncSessionLocal
import asyncio


# ── Logging configuration ──────────────────────────────────────────────────────

_LOG_LEVEL = "DEBUG" if settings.DEBUG else "INFO"

LOGGING_CONFIG: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "default",
            "filename": "phishguard.log",
            "maxBytes": 10_485_760,   # 10 MB
            "backupCount": 5,
        },
    },
    "root": {
        "level": _LOG_LEVEL,
        "handlers": ["console", "file"],
    },
    "loggers": {
        "uvicorn": {"level": "INFO", "propagate": True},
        "uvicorn.access": {"level": "WARNING", "propagate": True},
        "sqlalchemy.engine": {
            "level": "DEBUG" if settings.DEBUG else "WARNING",
            "propagate": True,
        },
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


# ── Lifespan context manager ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Code executed before the first request (startup) and after the last
    request is handled (shutdown).
    """
    # ── Startup ────────────────────────────────────────────────────────────────
    logger.info("PhishGuard UK backend starting up (environment=%s)", settings.ENVIRONMENT)

    # Load XGBoost model and SHAP explainer
    logger.info("Loading ML models from %s ...", settings.MODEL_DIR)
    load_models()
    load_email_model()
    logger.info("ML models loaded.")

    # ── Background Tasks ──────────────────────────────────────────────────────
    async def threat_intel_task():
        """
        Periodically refreshes the global threat intelligence feeds.
        Runs once on startup, then every hour.
        """
        # Wait a bit for the server to settle
        await asyncio.sleep(5)
        while True:
            try:
                async with AsyncSessionLocal() as db:
                    logger.info("Background Task: Refreshing Threat Intelligence...")
                    await intel_service.ingest_phishstats(db)
                    await intel_service.ingest_phishtank(db)
                    await intel_service.prune_old_threats(db, days=7)
                    logger.info("Background Task: Threat Intel Refresh Complete.")
            except Exception as e:
                logger.error("Background Task: Threat Intel Refresh Failed: %s", e)
            
            # Sleep for 1 hour
            await asyncio.sleep(3600)

    # Fire and forget the background task
    bg_task = asyncio.create_task(threat_intel_task())

    yield   # application is now running

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("PhishGuard UK backend shutting down.")


# ── Application factory ────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.
    Separated into a factory function so tests can call create_app() directly
    without triggering the lifespan on import.
    """
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Machine learning-based phishing URL detection API for the UK retail banking sector. "
            "Detects phishing URLs, emails, and domains using XGBoost trained on LegitPhish "
            "and PhiUSIIL datasets with UK-banking-specific feature engineering."
        ),
        docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # ── Rate limiter ─────────────────────────────────────────────────────────
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    application.add_middleware(SlowAPIMiddleware)

    # ── CORS ─────────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,   # required for httpOnly cookie auth
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # ── Security Headers ─────────────────────────────────────────────────────
    @application.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://images.unsplash.com; "
            "frame-src 'self' https://www.youtube.com; "
            "connect-src 'self' https://api.phishstats.info;"
        )
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # ── Routers ───────────────────────────────────────────────────────────────
    API_PREFIX = "/api"
    application.include_router(auth.router, prefix=API_PREFIX)
    application.include_router(scan.router, prefix=API_PREFIX)
    application.include_router(stats.router, prefix=API_PREFIX)
    application.include_router(news.router, prefix=API_PREFIX)
    application.include_router(history.router, prefix=API_PREFIX)
    application.include_router(support.router, prefix=API_PREFIX)
    application.include_router(ai.router, prefix=API_PREFIX)
    application.include_router(extension.router, prefix=API_PREFIX)

    # ── Health check ──────────────────────────────────────────────────────────
    @application.get("/health", tags=["System"], include_in_schema=False)
    async def health_check() -> dict:
        return {"status": "ok", "version": settings.APP_VERSION}

    # ── Global exception handler ──────────────────────────────────────────────
    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled exception on %s %s: %s",
            request.method, request.url.path, exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Please try again later."},
        )

    return application


# ── Module-level app instance ─────────────────────────────────────────────────
app: FastAPI = create_app()