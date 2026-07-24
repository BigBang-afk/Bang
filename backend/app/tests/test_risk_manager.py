import pytest

from app.services.risk_manager import (
    RiskLimitExceeded,
    RiskProfile,
    calculate_position_size,
    check_daily_loss_limit,
    check_max_simultaneous_trades,
    enforce_all_limits,
)


def make_profile(**overrides):
    defaults = dict(
        account_size=10_000,
        risk_per_trade_pct=1.0,
        max_daily_loss_pct=3.0,
        max_weekly_loss_pct=6.0,
        max_drawdown_pct=15.0,
        max_simultaneous_trades=3,
    )
    defaults.update(overrides)
    return RiskProfile(**defaults)


def test_position_size_long():
    profile = make_profile(account_size=10_000, risk_per_trade_pct=1.0)
    result = calculate_position_size(profile, entry_price=100, stop_loss_price=98, take_profit_price=106)

    assert result.risk_amount == pytest.approx(100.0)
    assert result.stop_loss_distance == pytest.approx(2.0)
    assert result.quantity == pytest.approx(50.0)
    assert result.position_value == pytest.approx(5000.0)
    assert result.risk_reward_ratio == pytest.approx(3.0)


def test_position_size_rejects_equal_entry_and_stop():
    profile = make_profile()
    with pytest.raises(ValueError):
        calculate_position_size(profile, entry_price=100, stop_loss_price=100)


def test_daily_loss_limit_breach_raises():
    profile = make_profile(account_size=10_000, max_daily_loss_pct=3.0)
    with pytest.raises(RiskLimitExceeded):
        check_daily_loss_limit(profile, realized_pnl_today=-350)


def test_daily_loss_limit_within_bounds_ok():
    profile = make_profile(account_size=10_000, max_daily_loss_pct=3.0)
    check_daily_loss_limit(profile, realized_pnl_today=-100)  # should not raise


def test_max_simultaneous_trades():
    profile = make_profile(max_simultaneous_trades=2)
    with pytest.raises(RiskLimitExceeded):
        check_max_simultaneous_trades(profile, open_trade_count=2)
    check_max_simultaneous_trades(profile, open_trade_count=1)


def test_enforce_all_limits_passes_when_healthy():
    profile = make_profile()
    enforce_all_limits(
        profile,
        realized_pnl_today=-50,
        realized_pnl_week=-100,
        peak_equity=10_000,
        current_equity=9_800,
        open_trade_count=1,
    )


def test_enforce_all_limits_raises_on_drawdown():
    profile = make_profile(max_drawdown_pct=10.0)
    with pytest.raises(RiskLimitExceeded):
        enforce_all_limits(
            profile,
            realized_pnl_today=0,
            realized_pnl_week=0,
            peak_equity=10_000,
            current_equity=8_500,
            open_trade_count=0,
        )
