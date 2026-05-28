from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_serializer


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for user profile update."""

    full_name: str | None = Field(None, min_length=1, max_length=255)


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID
    is_active: bool
    is_superuser: bool
    is_admin: bool = Field(default=False)
    created_at: datetime
    updated_at: datetime

    @field_serializer("is_admin")
    def serialize_is_admin(self, value: bool, _info) -> bool:
        return self.is_superuser

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(BaseModel):
    """Schema for login response with user data."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenRefresh(BaseModel):
    """Schema for token refresh."""

    refresh_token: str
