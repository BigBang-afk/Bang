from datetime import datetime

from pydantic import BaseModel

from app.models.enums import ConfidenceType, MarketCondition, SignalDirection, SignalResult, SignalStatus


class SignalReasonResponse(BaseModel):
    reason_code: str
    reason_text: str
    score: float


class SignalResponse(BaseModel):
    public_signal_id: str
    asset_symbol: str
    strategy_code: str
    strategy_name: str
    direction: SignalDirection
    timeframe: str
    expiry_seconds: int
    generated_at: datetime
    entry_time: datetime
    entry_window_end: datetime
    entry_price: float | None
    expiry_time: datetime
    expiry_price: float | None
    confidence: float
    confidence_type: ConfidenceType
    market_condition: MarketCondition
    status: SignalStatus
    result: SignalResult
    strategy_version: int
    model_version: str | None
    provider: str
    data_latency_ms: int
    ai_auto_mode: bool
    supporting_strategies: list[str]
    reasons: list[SignalReasonResponse]


class SignalStatisticsResponse(BaseModel):
    total_completed: int
    wins: int
    losses: int
    draws: int
    data_errors: int
    win_rate: float
    win_rate_excluding_draws: float
    max_losing_streak: int
    max_winning_streak: int
    by_strategy: dict[str, dict]
    by_asset: dict[str, dict]
    by_expiry: dict[str, dict]
