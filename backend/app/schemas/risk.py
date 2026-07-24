from pydantic import BaseModel


class PositionSizeRequest(BaseModel):
    account_size: float
    risk_per_trade_pct: float
    entry_price: float
    stop_loss_price: float
    take_profit_price: float | None = None


class PositionSizeResponse(BaseModel):
    risk_amount: float
    stop_loss_distance: float
    quantity: float
    position_value: float
    risk_reward_ratio: float | None
