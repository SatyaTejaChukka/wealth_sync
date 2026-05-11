from pathlib import Path
from typing import Any, List, Union
import json
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from pydantic import PostgresDsn, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=str(BACKEND_ENV_FILE),
    )

    PROJECT_NAME: str = "WealthSync"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    ENABLE_DOCS: bool = True
    AUTO_CREATE_TABLES: bool = True
    
    # Cors
    BACKEND_CORS_ORIGINS: List[str] = []
    ALLOWED_HOSTS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str], None]) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        raise ValueError(v)

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str], None]) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        raise ValueError(v)

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug(cls, v: Any) -> bool | Any:
        if isinstance(v, str):
            normalized = v.strip().lower()
            if normalized in {"release", "prod", "production", "0", "false", "no", "off"}:
                return False
            if normalized in {"debug", "dev", "development", "1", "true", "yes", "on"}:
                return True
        return v

    # Security
    SECRET_KEY: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    PASSWORD_MIN_LENGTH: int = 8
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_SIGNUP: str = "3/minute"

    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "wealth_sync"
    DATABASE_URL: PostgresDsn | None = None
    
    # Database Pool
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Monitoring
    SENTRY_DSN: str | None = None
    REDIS_URL: str = "redis://redis:6379/0"

    # Payments / Autopilot
    PAYMENTS_PROVIDER: str = "internal_ledger"
    PAYMENTS_PROVIDER_BASE_URL: str | None = None
    PAYMENTS_PROVIDER_API_KEY: str | None = None
    PAYMENTS_PROVIDER_API_SECRET: str | None = None
    PAYMENTS_AUTO_EXECUTE_ON_APPROVAL: bool = True
    AUTOPILOT_PAYMENT_PREPARE_DAYS: int = 7

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info: ValidationInfo) -> str | PostgresDsn:
        if isinstance(v, str) and v:
            v = v.strip()
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and "+asyncpg" not in v:
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)

            # SQLAlchemy asyncpg passes query params as kwargs to asyncpg.connect().
            # asyncpg accepts `ssl=...`, not `sslmode=...`.
            parts = urlsplit(v)
            query_params = dict(parse_qsl(parts.query, keep_blank_values=True))
            if "sslmode" in query_params and "ssl" not in query_params:
                query_params["ssl"] = query_params["sslmode"]
            if "sslmode" in query_params:
                del query_params["sslmode"]
            normalized_query = urlencode(query_params)
            v = urlunsplit((parts.scheme, parts.netloc, parts.path, normalized_query, parts.fragment))
            return v

        data = info.data
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=data.get("POSTGRES_USER"),
            password=data.get("POSTGRES_PASSWORD"),
            host=data.get("POSTGRES_SERVER"),
            path=f"{data.get('POSTGRES_DB') or ''}",
        )

    @model_validator(mode="after")
    def ensure_secret_key(self):
        if self.SECRET_KEY:
            return self

        if self.ENVIRONMENT == "production":
            raise ValueError("SECRET_KEY is required in production")

        # Stable local-only fallback so the app can boot without a .env file.
        self.SECRET_KEY = "dev-only-secret-key-change-me"
        return self

settings = Settings()
