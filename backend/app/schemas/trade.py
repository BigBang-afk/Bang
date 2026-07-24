import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.trade import TradeSide, TradeStatus


class TradeCreate(BaseModel):
    symbol: str
    side: TradeSide
    entry_price: float
    stop_loss: float | None = None
    take_profit_1: float | None = None
    take_profit_2: float | None = None
    take_profit_3: float | None = None
    quantity: float
    leverage: float = 1
    risk_percent: float
    trading_mode: str
    timeframe: str
    signal_id: uuid.UUID | None = None
    reasons: str | None = None


class TradeUpdate(BaseModel):
    exit_price: float | None = None
    status: TradeStatus | None = None
    pnl: float | None = None
    pnl_percent: float | None = None
    screenshot_url: str | None = None
    mistakes: str | None = None
    notes: str | None = None


class TradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: str
    side: TradeSide
    status: TradeStatus
    entry_price: float
    exit_price: float | None
    stop_loss: float | None
    take_profit_1: float | None
    take_profit_2: float | None
    take_profit_3: float | None
    quantity: float
    leverage: float
    risk_percent: float
    risk_reward_ratio: float | None
    pnl: float | None
    pnl_percent: float | None
    trading_mode: str
    timeframe: str
    screenshot_url: str | None
    mistakes: str | None
    notes: str | None
    reasons: str | None
    opened_at: datetime
    closed_at: datetime | None
