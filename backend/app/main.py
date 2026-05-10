import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import sentry_sdk
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.middleware import (
    SecurityHeadersMiddleware, 
    RequestContextMiddleware,
    limiter,
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)
from app.core.database import engine, Base
from sqlalchemy import text

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Setup Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=1.0)

docs_url = "/docs" if settings.ENABLE_DOCS else None
redoc_url = "/redoc" if settings.ENABLE_DOCS else None
openapi_url = f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=openapi_url,
    docs_url=docs_url,
    redoc_url=redoc_url,
    debug=settings.DEBUG
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)

# Trusted hosts (Host header protection)
if settings.ALLOWED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Static files
os.makedirs("app/static/avatars", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.on_event("startup")
async def startup():
    logger.info("Starting up application...")
    # Create tables (dev-only unless explicitly enabled)
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

@app.get("/health")
async def health_check():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            db_status = [row[0] for row in result]
        return {"status": "ok", "app_name": settings.PROJECT_NAME, "env": settings.ENVIRONMENT, "db": db_status}
    except Exception as e:
        logger.error(f"Health check db query failed: {e}")
        return {"status": "ok", "app_name": settings.PROJECT_NAME, "env": settings.ENVIRONMENT, "db": "error"}

@app.get("/")
def root():
    return {"message": "Welcome to WealthSync API"}

# Routes
from app.api.v1 import (
    auth, income, categories, budgets, transactions, 
    bills, savings, subscriptions, users, dashboard, notifications, health, autopilot
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(income.router, prefix=f"{settings.API_V1_STR}/income", tags=["income"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(budgets.router, prefix=f"{settings.API_V1_STR}/budgets", tags=["budgets"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(bills.router, prefix=f"{settings.API_V1_STR}/bills", tags=["bills"])
app.include_router(savings.router, prefix=f"{settings.API_V1_STR}/goals", tags=["savings"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["subscriptions"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(autopilot.router, prefix=f"{settings.API_V1_STR}/autopilot", tags=["autopilot"])
app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])
