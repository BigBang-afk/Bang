"""Position sizing & risk management calculators."""

from __future__ import annotations

from pydantic import BaseModel


class PositionSizeRequest(BaseModel):
    account_balance: float
    risk_percent: float
    entry_price: float
    stop_loss: float
    leverage: float = 1.0
    take_profit: float | None = None


class PositionSizeResult(BaseModel):
    dollar_risk: float
    position_size_units: float
    position_notional: float
    margin_required: float
    stop_distance_percent: float
    take_profit_distance_percent: float | None
    expected_value: float | None
    risk_reward_ratio: float | None


def calculate_position_size(req: PositionSizeRequest) -> PositionSizeResult:
    dollar_risk = req.account_balance * (req.risk_percent / 100)
    stop_distance = abs(req.entry_price - req.stop_loss)
    if stop_distance <= 0:
        raise ValueError("Stop loss must differ from entry price")

    position_size_units = dollar_risk / stop_distance
    position_notional = position_size_units * req.entry_price
    margin_required = position_notional / max(req.leverage, 1e-9)
    stop_distance_percent = round(stop_distance / req.entry_price * 100, 4)

    tp_distance_pct = None
    expected_value = None
    rr = None
    if req.take_profit:
        reward_distance = abs(req.take_profit - req.entry_price)
        tp_distance_pct = round(reward_distance / req.entry_price * 100, 4)
        rr = round(reward_distance / stop_distance, 4)
        # Simple EV assuming a 50% base win rate as illustrative default; the
        # caller should override with a strategy's real historical win rate.
        win_rate = 0.5
        expected_value = round(win_rate * reward_distance * position_size_units - (1 - win_rate) * dollar_risk, 2)

    return PositionSizeResult(
        dollar_risk=round(dollar_risk, 2),
        position_size_units=round(position_size_units, 8),
        position_notional=round(position_notional, 2),
        margin_required=round(margin_required, 2),
        stop_distance_percent=stop_distance_percent,
        take_profit_distance_percent=tp_distance_pct,
        expected_value=expected_value,
        risk_reward_ratio=rr,
    )


class RiskLimits(BaseModel):
    max_daily_loss_percent: float = 3.0
    max_weekly_loss_percent: float = 8.0
    max_consecutive_losses: int = 4
    recommended_capital_allocation_percent: float = 2.0


def evaluate_risk_limits(
    limits: RiskLimits, daily_loss_percent: float, weekly_loss_percent: float, consecutive_losses: int
) -> dict:
    breaches = []
    if daily_loss_percent >= limits.max_daily_loss_percent:
        breaches.append("daily_loss_limit_hit")
    if weekly_loss_percent >= limits.max_weekly_loss_percent:
        breaches.append("weekly_loss_limit_hit")
    if consecutive_losses >= limits.max_consecutive_losses:
        breaches.append("max_consecutive_losses_hit")
    return {"trading_allowed": len(breaches) == 0, "breaches": breaches}
