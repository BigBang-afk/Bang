from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.enums import AssetType


class AssetResponse(BaseModel):
    id: str
    symbol: str
    display_name: str
    asset_type: AssetType
    pip_precision: int
    is_enabled: bool

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)


class CandleResponse(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    is_complete: bool


class ExpiryAvailabilityResponse(BaseModel):
    seconds: int
    enabled: bool
    reason: str | None
