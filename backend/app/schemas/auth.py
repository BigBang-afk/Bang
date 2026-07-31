from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import SubscriptionPlan, UserRole


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    timezone: str = "UTC"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth2 token-type field, not a credential


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    subscription_plan: SubscriptionPlan
    subscription_expires_at: datetime | None
    timezone: str
    is_active: bool
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)
