# Chapter 6: FastAPI Core Setup - Line by Line

> **Foundation Layer**: Understanding every line of FastAPI initialization, middleware, and core configurations.

---

## File Structure Overview

```
backend/app/
├── main.py                  # Application entry point ⭐
├── core/
│   ├── config.py            # Environment & settings ⭐
│   ├── database.py          # DB connection pooling ⭐
│   ├── security.py          # Password & JWT handling ⭐
│   ├── middleware.py        # Custom middleware ⭐
│   └── logging_config.py    # Logging setup ⭐
```

---

## File 1: main.py - Application Entry Point

### Lines 1-11: Imports

```python
# Line 1-2: Standard library
import logging  # Python's logging framework
import os       # File/directory operations

# Line 3-7: FastAPI core
from fastapi import FastAPI, Request
# ↑ FastAPI: Main app class
# ↑ Request: HTTP request type hint

from fastapi.middleware.cors import CORSMiddleware
# ↑ Cross-Origin Resource Sharing (allows frontend on different domain)

from fastapi.staticfiles import StaticFiles
# ↑ Serve static files (avatars, uploads)

from fastapi.exceptions import RequestValidationError
# ↑ Pydantic validation errors

from fastapi.responses import JSONResponse
# ↑ Custom JSON response formatting

# Line 8: Error tracking
import sentry_sdk
# ↑ Sentry: Production error monitoring & alerting

# Line 9: Security middleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
# ↑ Prevents Host header attacks (DNS rebinding)

# Line 11-20: Application imports
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.middleware import (
    SecurityHeadersMiddleware,     # Adds security headers
    RequestContextMiddleware,      # Request ID & timing
    limiter,                       # Rate limiting
    RateLimitExceeded,            # Rate limit exception
    _rate_limit_exceeded_handler  # Handler function
)
from app.core.database import engine, Base
```

---

### Lines 22-28: Initialization

```python
# Line 22-24: Setup logging FIRST
setup_logging()
logger = logging.getLogger(__name__)
# ↑ Must happen before any logging calls
# ↑ __name__ = "app.main" (logger hierarchy)

# Line 26-28: Sentry initialization (production only)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,        # Connection string
        traces_sample_rate=1.0          # 100% of errors tracked
    )
# ↑ Only runs if SENTRY_DSN environment variable set
# ↑ In dev: No Sentry → errors only in logs
# ↑ In prod: Errors sent to Sentry dashboard

# DESIGN DECISION: Why Sentry?
# - Real-time error alerts (email/Slack)
# - Stack traces with variable values
# - Error grouping & trend analysis
# - Performance monitoring
```

---

### Lines 30-40: FastAPI App Creation

```python
# Line 30-32: Conditional API docs
docs_url = "/docs" if settings.ENABLE_DOCS else None
redoc_url = "/redoc" if settings.ENABLE_DOCS else None
openapi_url = f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None
# ↑ Production: ENABLE_DOCS=False → docs disabled (security)
# ↑ Development: ENABLE_DOCS=True → Swagger UI at /docs

# Line 34-40: Create FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,      # "WealthSync"
    openapi_url=openapi_url,          # Where OpenAPI schema lives
    docs_url=docs_url,                # Swagger UI endpoint
    redoc_url=redoc_url,              # ReDoc UI endpoint
    debug=settings.DEBUG              # Debug mode (verbose errors)
)
# ↑ SINGLETON PATTERN: Only ONE app instance exists
# ↑ This object is imported by uvicorn to run the server
```

**Why disable docs in production?**

- **Security**: Exposes all endpoints & schemas
- **Performance**: OpenAPI schema generation has overhead
- **Attack surface**: Reduces information leakage

---

### Lines 42-44: Rate Limiting Setup

```python
# Line 42-44: Attach rate limiter
app.state.limiter = limiter
# ↑ Store limiter in app state (accessible in routes)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# ↑ When rate limit hit, call custom handler
# ↑ Returns 429 Too Many Requests with Retry-After header
```

---

### Lines 46-62: Middleware Stack

**CRITICAL**: Middleware order matters! They wrap in reverse order:

```
Request  →  SecurityHeaders  →  RequestContext  →  TrustedHost  →  CORS  →  Route  →  Response
Response  ←  SecurityHeaders  ←  RequestContext  ←  TrustedHost  ←  CORS  ←  Route  ←  Request
```

```python
# Line 46-48: Custom middleware (FIRST applied = OUTERMOST wrapper)
app.add_middleware(SecurityHeadersMiddleware)
# ↑ Adds: X-Content-Type-Options, X-Frame-Options, etc.
# ↑ Prevents: XSS, clickjacking, MIME sniffing attacks

app.add_middleware(RequestContextMiddleware)
# ↑ Adds: X-Request-ID (for log correlation)
# ↑ Adds: X-Process-Time (performance monitoring)

# Line 50-52: Trusted hosts (Host header validation)
if settings.ALLOWED_HOSTS:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )
# ↑ Rejects requests with invalid Host header
# ↑ Prevents DNS rebinding attacks
# ↑ Example: ALLOWED_HOSTS=["wealthsync.com", "*.wealthsync.com"]

# Line 54-62: CORS (allow frontend on different domain)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,  # ["http://localhost:5173"]
        allow_credentials=True,                       # Allow cookies/auth headers
        allow_methods=["*"],                          # All HTTP methods
        allow_headers=["*"],                          # All headers
    )
# ↑ Without this: Browser blocks frontend requests (same-origin policy)
# ↑ With this: Browser allows requests from listed origins
```

**Why middleware order matters**:

1. SecurityHeaders FIRST → Ensures ALL responses have security headers
2. RequestContext SECOND → All errors get request ID
3. CORS LAST → Handles preflight before route processing

---

### Lines 64-66: Static Files

```python
# Line 64-66: Serve user uploads
os.makedirs("app/static/avatars", exist_ok=True)
# ↑ Create directory if doesn't exist
# ↑ exist_ok=True: Don't error if already exists

app.mount("/static", StaticFiles(directory="app/static"), name="static")
# ↑ /static/avatars/user123.jpg → app/static/avatars/user123.jpg
# ↑ Served directly (no route processing)
```

---

### Lines 68-75: Lifecycle Events

```python
# Line 68-75: Startup event
@app.on_event("startup")
async def startup():
    logger.info("Starting up application...")

    # Auto-create tables (dev convenience)
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
# ↑ Runs ONCE when server starts
# ↑ Production: AUTO_CREATE_TABLES=False (use migrations)
# ↑ Development: AUTO_CREATE_TABLES=True (convenience)
```

**Why not always auto-create?**

- **Data loss risk**: Can't handle schema changes (migrations required)
- **Downtime**: Creating tables is slow on large databases
- **Best practice**: Use Alembic migrations in production

---

### Lines 77-83: Global Exception Handlers

```python
# Line 77-83: Pydantic validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,                    # Unprocessable Entity
        content={
            "detail": exc.errors(),          # Field-level errors
            "body": str(exc.body)           # Original request body
        },
    )
# ↑ Catches Pydantic validation failures
# ↑ Returns structured error: [{"loc": ["body", "email"], "msg": "Invalid email"}]
```

---

### Lines 85-91: Health Check Routes

```python
# Line 85-87: Health check (for load balancers)
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app_name": settings.PROJECT_NAME,
        "env": settings.ENVIRONMENT
    }
# ↑ Used by: Docker health checks, load balancers, monitoring
# ↑ Returns 200 OK if server is running

# Line 89-91: Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to WealthSync API"}
```

---

### Lines 93-112: Route Registration

```python
# Line 93-97: Import all routers
from app.api.v1 import (
    auth, income, categories, budgets, transactions,
    bills, savings, subscriptions, users, dashboard,
    notifications, health, autopilot
)

# Line 99-111: Register routers with prefixes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
# ↑ All routes in auth.router now start with /api/v1/auth
# ↑ tags=["auth"]: Groups endpoints in OpenAPI docs

app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
# ... (repeated for all modules)
```

**Design Pattern**: Router composition

- Each module exports a `router` object
- Main app assembles all routers with prefixes
- **Benefits**: Modular, easy to disable features, clear organization

---

## File 2: core/config.py - Settings Management

### Using Pydantic BaseSettings

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Environment variables automatically loaded
    PROJECT_NAME: str = "WealthSync"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Security
    SECRET_KEY: str  # REQUIRED (no default)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520  # 8 days

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()  # Singleton instance
```

**Why Pydantic Settings?**

- ✅ Type validation (DATABASE_URL must be string)
- ✅ Auto-loads from .env file
- ✅ Fails fast on missing required variables
- ✅ IDE autocomplete

---

## File 3: core/middleware.py - Custom Middleware

### SecurityHeadersMiddleware

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)  # Process request

        # Add security headers to response
        response.headers["X-Content-Type-Options"] = "nosniff"
        # ↑ Prevents MIME sniffing attacks

        response.headers["X-Frame-Options"] = "DENY"
        # ↑ Prevents clickjacking (iframe embedding)

       response.headers["X-XSS-Protection"] = "1; mode=block"
        # ↑ Enables XSS filter in browsers

        response.headers["Strict-Transport-Security"] = "max-age=31536000"
        # ↑ Forces HTTPS for 1 year

        return response
```

### RequestContextMiddleware

```python
class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Measure processing time
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000  # ms

        # Add to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

        return response
```

**Use case**: Log correlation

```
[2024-01-15 10:30:00] INFO [req-abc123] User login attempt
[2024-01-15 10:30:01] ERROR [req-abc123] Database connection failed
```

---

## Key Takeaways

1. **main.py**: Entry point, assembles all components
2. **Middleware order**: Critical for security
3. **Settings**: Environment-driven configuration
4. **Lifecycle events**: Startup/shutdown hooks
5. **Error handling**: Global exception handlers
6. **Sentry**: Production error tracking

---

## Navigation

**Previous Chapter**: [← Chapter 5: SQLAlchemy Models](./Chapter_05_SQLAlchemy_Models.md)

**Next Chapter**: [→ Chapter 7: Pydantic Schemas](./Chapter_07_Pydantic_Schemas.md)

**Back to Index**: [📚 Tutorial Home](./README.md)
