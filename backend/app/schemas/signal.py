import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.signal import SignalDirection, SignalStatus


class SignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: str
    direction: SignalDirection
    status: SignalStatus
    trading_mode: str
    timeframe: str
    entry_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    take_profit_3: float
    invalidation_level: float
    risk_reward_ratio: float
    confidence_score: float
    score_breakdown: dict
    reasons: list[str]
    market_structure_summary: str
    expected_scenario: str
    estimated_holding_time: str
    higher_timeframe_confirmed: bool
    created_at: datetime
    expires_at: datetime | None


class ScanRequest(BaseModel):
    trading_mode: str  # scalping | intraday
    symbols: list[str] | None = None  # None = scan all active USDT pairs
