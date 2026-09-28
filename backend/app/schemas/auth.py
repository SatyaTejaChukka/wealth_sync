from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.core.config import settings

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(min_length=settings.PASSWORD_MIN_LENGTH, max_length=128)
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
