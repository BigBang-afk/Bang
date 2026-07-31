from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import BacktestStatus


class BacktestCreateRequest(BaseModel):
    strategy_id: str
    asset_id: str
    timeframe: str = "1m"
    expiry_seconds: int = 60
    start: datetime
    end: datetime
    payout_ratio: float = Field(default=0.85, ge=0.0, le=5.0)


class BacktestResponse(BaseModel):
    id: str
    strategy_id: str
    asset_id: str
    timeframe: str
    expiry_seconds: int
    started_at: datetime | None
    completed_at: datetime | None
    configuration_json: dict
    metrics_json: dict
    status: BacktestStatus
    error_message: str | None

    model_config = {"from_attributes": True}

    @field_validator("id", "strategy_id", "asset_id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)
