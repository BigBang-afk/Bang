from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.enums import SubscriptionPlan, UserRole


class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None
    subscription_plan: SubscriptionPlan | None = None


class AdminUserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    subscription_plan: SubscriptionPlan
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)


class AdminStrategyUpdateRequest(BaseModel):
    is_enabled: bool | None = None
    configuration_json: dict | None = None


class ConfidenceThresholdsRequest(BaseModel):
    no_trade_below: float | None = None
    weak_max: float | None = None
    moderate_max: float | None = None
    strong_max: float | None = None


class ModelTrainRequest(BaseModel):
    asset_id: str
    strategy_id: str
    timeframe: str = "1m"
    expiry_seconds: int = 60


class ModelVersionResponse(BaseModel):
    id: str
    asset_id: str
    strategy_id: str
    name: str
    version: int
    metrics_json: dict
    probability_threshold: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", "asset_id", "strategy_id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)


class AuditLogResponse(BaseModel):
    id: str
    user_id: str | None
    action: str
    entity_type: str
    entity_id: str
    previous_value_json: dict | None
    new_value_json: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str | None:
        return str(value) if value is not None else None


class ProviderHealthResponse(BaseModel):
    active_provider: str
    using_fallback: bool
    connected: bool
    latency_ms: float | None
    last_tick_at: datetime | None
    reconnect_count: int
    is_delayed: bool
    last_error: str | None


class DashboardResponse(BaseModel):
    total_users: int
    active_users: int
    total_signals: int
    signals_today: int
    win_rate: float
    signal_engine_paused: bool
    active_provider: str
    provider_connected: bool
