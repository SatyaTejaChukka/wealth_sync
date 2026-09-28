from typing import Generator, Annotated, Optional
import logging
from pathlib import Path
import os
import time
import urllib.request
import json

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials
except ImportError:
    firebase_admin = None
    firebase_auth = None
    credentials = None

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import TokenPayload

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_cached_google_certs = {}
_google_certs_expiry = 0
_firebase_initialized = False

def get_google_public_certs() -> dict:
    """
    Fetch and cache Google's public certificates for Firebase ID token verification.
    """
    global _cached_google_certs, _google_certs_expiry
    now = time.time()
    if _cached_google_certs and now < _google_certs_expiry:
        return _cached_google_certs

    try:
        req = urllib.request.Request(GOOGLE_CERTS_URL, headers={"User-Agent": "WealthSync-Auth"})
        with urllib.request.urlopen(req, timeout=5) as response:
            cache_control = response.headers.get("Cache-Control", "")
            max_age = 3600
            for part in cache_control.split(","):
                if "max-age=" in part:
                    try:
                        max_age = int(part.split("=")[1].strip())
                    except ValueError:
                        pass
            certs = json.loads(response.read().decode())
            _cached_google_certs = certs
            _google_certs_expiry = now + max_age
            return certs
    except Exception as e:
        logger.error("Failed to fetch Google public certs: %s", e)
        return _cached_google_certs


def get_firebase_app():
    """
    Safely initialize or retrieve Firebase Admin app singleton.
    """
    global _firebase_initialized
    if firebase_admin is None:
        return None

    if _firebase_initialized:
        try:
            return firebase_admin.get_app()
        except Exception:
            _firebase_initialized = False

    if getattr(firebase_admin, "_apps", None):
        _firebase_initialized = True
        return firebase_admin.get_app()

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    project_id = settings.FIREBASE_PROJECT_ID

    if cred_path and Path(cred_path).exists():
        try:
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            return app
        except Exception as e:
            logger.warning("Failed to initialize Firebase with credentials file %s: %s", cred_path, e)

    if project_id:
        try:
            app = firebase_admin.initialize_app(options={"projectId": project_id})
            _firebase_initialized = True
            return app
        except Exception as e:
            logger.warning("Failed to initialize Firebase with projectId %s: %s", project_id, e)

    if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
        try:
            app = firebase_admin.initialize_app()
            _firebase_initialized = True
            return app
        except Exception as e:
            logger.warning("Failed to initialize Firebase with default credentials: %s", e)

    return None


def verify_firebase_id_token(token: str) -> Optional[dict]:
    """
    Verify a Firebase ID token using Google public certificates or Firebase Admin SDK.
    Returns decoded token dictionary or None if invalid.
    """
    project_id = settings.FIREBASE_PROJECT_ID

    # 1. Verify using Google's public certificates directly (works everywhere with 0 credentials setup)
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if kid:
            certs = get_google_public_certs()
            cert = certs.get(kid)
            if not cert:
                certs = get_google_public_certs()
                cert = certs.get(kid)

            if cert:
                if project_id:
                    decoded = jwt.decode(
                        token,
                        cert,
                        algorithms=["RS256"],
                        audience=project_id,
                        issuer=f"https://securetoken.google.com/{project_id}"
                    )
                else:
                    decoded = jwt.decode(token, cert, algorithms=["RS256"], options={"verify_aud": False})
                return decoded
    except Exception as e:
        logger.debug("Public certificate verification failed: %s", e)

    # 2. Fallback to Firebase Admin SDK if service account is configured
    app = get_firebase_app()
    if app and firebase_auth:
        try:
            return firebase_auth.verify_id_token(token, check_revoked=False)
        except Exception as e:
            logger.debug("Firebase Admin SDK verification failed: %s", e)

    return None


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Determine if token looks like a Firebase token or local HMAC JWT
    is_firebase_candidate = False
    try:
        unverified_header = jwt.get_unverified_header(token)
        unverified_claims = jwt.get_unverified_claims(token)
        alg = unverified_header.get("alg")
        iss = unverified_claims.get("iss", "")
        if alg == "RS256" or (isinstance(iss, str) and iss.startswith("https://securetoken.google.com/")):
            is_firebase_candidate = True
    except Exception:
        # Invalid format; will fail in subsequent decode steps
        pass

    # 2. Try Firebase ID Token verification if candidate or Firebase is configured
    if is_firebase_candidate:
        firebase_payload = verify_firebase_id_token(token)
        if firebase_payload:
            uid = firebase_payload.get("uid") or firebase_payload.get("sub")
            email = firebase_payload.get("email")
            name = firebase_payload.get("name")
            picture = firebase_payload.get("picture")

            if not uid:
                raise credentials_exception

            # Lookup user by firebase_uid
            result = await db.execute(select(User).filter(User.firebase_uid == uid))
            user = result.scalars().first()

            # Fallback lookup by id == uid
            if not user:
                result = await db.execute(select(User).filter(User.id == uid))
                user = result.scalars().first()
                if user and not user.firebase_uid:
                    user.firebase_uid = uid
                    await db.commit()
                    await db.refresh(user)

            # Fallback lookup by email (Link existing user accounts)
            if not user and email:
                result = await db.execute(select(User).filter(User.email == email))
                user = result.scalars().first()
                if user:
                    user.firebase_uid = uid
                    if name and not user.full_name:
                        user.full_name = name
                    if picture and not user.avatar_url:
                        user.avatar_url = picture
                    await db.commit()
                    await db.refresh(user)

            # JIT Provisioning if user does not exist at all
            if not user and email:
                user = User(
                    id=uid,
                    firebase_uid=uid,
                    email=email,
                    full_name=name,
                    avatar_url=picture,
                    is_active=True,
                    password_hash=None
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

                # Seed default budget categories for the new user
                try:
                    from app.api.v1.auth import seed_default_categories
                    await seed_default_categories(db, user.id)
                except Exception as e:
                    logger.error("Failed to seed default categories for JIT user %s: %s", user.id, e)

            if not user or not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")

            return user

    # 3. Fallback: Local HMAC JWT Token (used for tests, legacy sessions, CLI)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).filter(User.id == token_data.sub))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user
