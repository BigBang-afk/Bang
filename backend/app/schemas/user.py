import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    is_verified: bool
    totp_enabled: bool
    subscription_tier: str
    subscription_expires_at: datetime | None
    created_at: datetime


class RiskSettingsIn(BaseModel):
    account_size: float
    risk_per_trade_pct: float
    max_daily_loss_pct: float
    max_weekly_loss_pct: float
    max_drawdown_pct: float
    max_simultaneous_trades: int
    trading_mode: str  # scalping | intraday


class ApiKeyIn(BaseModel):
    label: str = "default"
    api_key: str
    api_secret: str
    read_only: bool = False


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    exchange: str
    is_active: bool
    read_only: bool
    created_at: datetime
