from pydantic import BaseModel, field_validator


class StrategyResponse(BaseModel):
    id: str
    strategy_code: str
    name: str
    description: str
    version: int
    configuration_json: dict
    supported_assets_json: list
    supported_timeframes_json: list
    supported_expiries_json: list
    is_enabled: bool

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def _stringify_id(cls, value: object) -> str:
        return str(value)


class StrategyStatsResponse(StrategyResponse):
    total_signals: int
    win_rate: float | None
    risk_level: str


class StrategyPreferenceRequest(BaseModel):
    selected_strategy_id: str | None = None
    ai_auto_enabled: bool = False
    selected_asset_id: str | None = None
    selected_timeframe: str = "1m"
    selected_expiry_seconds: int = 60
    sound_enabled: bool = True


class StrategyPreferenceResponse(BaseModel):
    selected_strategy_id: str | None
    ai_auto_enabled: bool
    selected_asset_id: str | None
    selected_timeframe: str
    selected_expiry_seconds: int
    sound_enabled: bool

    model_config = {"from_attributes": True}

    @field_validator("selected_strategy_id", "selected_asset_id", mode="before")
    @classmethod
    def _stringify_ids(cls, value: object) -> str | None:
        return str(value) if value is not None else None
