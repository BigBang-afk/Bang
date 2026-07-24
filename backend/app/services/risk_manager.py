"""Position sizing and risk-limit enforcement. This module never places an order itself —
it only computes sizes and answers whether a proposed trade is within the user's configured limits."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RiskProfile:
    account_size: float
    risk_per_trade_pct: float  # e.g. 0.5 for 0.5%
    max_daily_loss_pct: float
    max_weekly_loss_pct: float
    max_drawdown_pct: float
    max_simultaneous_trades: int


@dataclass
class PositionSizeResult:
    risk_amount: float
    stop_loss_distance: float
    quantity: float
    position_value: float
    risk_reward_ratio: float | None


class RiskLimitExceeded(Exception):
    pass


def calculate_position_size(
    risk_profile: RiskProfile,
    entry_price: float,
    stop_loss_price: float,
    take_profit_price: float | None = None,
) -> PositionSizeResult:
    if entry_price <= 0 or stop_loss_price <= 0:
        raise ValueError("entry_price and stop_loss_price must be positive")
    if entry_price == stop_loss_price:
        raise ValueError("stop_loss_price cannot equal entry_price")

    risk_amount = risk_profile.account_size * (risk_profile.risk_per_trade_pct / 100)
    stop_loss_distance = abs(entry_price - stop_loss_price)
    quantity = risk_amount / stop_loss_distance
    position_value = quantity * entry_price

    rr = None
    if take_profit_price is not None:
        reward_distance = abs(take_profit_price - entry_price)
        rr = round(reward_distance / stop_loss_distance, 4) if stop_loss_distance else None

    return PositionSizeResult(
        risk_amount=round(risk_amount, 8),
        stop_loss_distance=round(stop_loss_distance, 8),
        quantity=round(quantity, 8),
        position_value=round(position_value, 8),
        risk_reward_ratio=rr,
    )


def check_daily_loss_limit(risk_profile: RiskProfile, realized_pnl_today: float) -> None:
    max_loss = risk_profile.account_size * (risk_profile.max_daily_loss_pct / 100)
    if realized_pnl_today <= -max_loss:
        raise RiskLimitExceeded(
            f"Daily loss limit reached: {realized_pnl_today:.2f} <= -{max_loss:.2f}. Trading halted for today."
        )


def check_weekly_loss_limit(risk_profile: RiskProfile, realized_pnl_week: float) -> None:
    max_loss = risk_profile.account_size * (risk_profile.max_weekly_loss_pct / 100)
    if realized_pnl_week <= -max_loss:
        raise RiskLimitExceeded(
            f"Weekly loss limit reached: {realized_pnl_week:.2f} <= -{max_loss:.2f}. Trading halted for this week."
        )


def check_drawdown_limit(risk_profile: RiskProfile, peak_equity: float, current_equity: float) -> None:
    if peak_equity <= 0:
        return
    drawdown_pct = (peak_equity - current_equity) / peak_equity * 100
    if drawdown_pct >= risk_profile.max_drawdown_pct:
        raise RiskLimitExceeded(
            f"Max drawdown breached: {drawdown_pct:.2f}% >= {risk_profile.max_drawdown_pct:.2f}%. Trading halted."
        )


def check_max_simultaneous_trades(risk_profile: RiskProfile, open_trade_count: int) -> None:
    if open_trade_count >= risk_profile.max_simultaneous_trades:
        raise RiskLimitExceeded(
            f"Max simultaneous trades reached: {open_trade_count} >= {risk_profile.max_simultaneous_trades}."
        )


def enforce_all_limits(
    risk_profile: RiskProfile,
    realized_pnl_today: float,
    realized_pnl_week: float,
    peak_equity: float,
    current_equity: float,
    open_trade_count: int,
) -> None:
    """Raises RiskLimitExceeded on the first breached limit; call before allowing a new trade."""
    check_daily_loss_limit(risk_profile, realized_pnl_today)
    check_weekly_loss_limit(risk_profile, realized_pnl_week)
    check_drawdown_limit(risk_profile, peak_equity, current_equity)
    check_max_simultaneous_trades(risk_profile, open_trade_count)
