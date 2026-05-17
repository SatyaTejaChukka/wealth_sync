from typing import Any, Annotated
from datetime import timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.errors import ErrorCode, error_payload
from app.core.middleware import limiter
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserResponse, Token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/signup", response_model=Token, status_code=201)
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
async def create_user(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Create new user and return access token.
    """
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        logger.info("Signup attempt for existing email")
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    try:
        user = User(
            email=user_in.email,
            password_hash=security.get_password_hash(user_in.password),
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("User created successfully")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id,
                expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
    except Exception:
        logger.exception("Error creating user")
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=error_payload(
                ErrorCode.INTERNAL_ERROR,
                "Failed to create user.",
            ),
        )

@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login_access_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id,
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(deps.get_current_user)]
) -> Any:
    """
    Get current user.
    """
    return current_user
