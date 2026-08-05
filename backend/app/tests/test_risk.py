import pytest

from app.risk.position_sizing import PositionSizeRequest, calculate_position_size, evaluate_risk_limits, RiskLimits


def test_calculate_position_size_basic():
    req = PositionSizeRequest(account_balance=10_000, risk_percent=1, entry_price=100, stop_loss=95, leverage=2, take_profit=115)
    result = calculate_position_size(req)
    assert result.dollar_risk == 100
    assert result.position_size_units == pytest.approx(20.0)
    assert result.risk_reward_ratio == pytest.approx(3.0)


def test_calculate_position_size_rejects_zero_stop_distance():
    req = PositionSizeRequest(account_balance=10_000, risk_percent=1, entry_price=100, stop_loss=100)
    with pytest.raises(ValueError):
        calculate_position_size(req)


def test_evaluate_risk_limits_breach():
    limits = RiskLimits(max_daily_loss_percent=3, max_weekly_loss_percent=8, max_consecutive_losses=4)
    result = evaluate_risk_limits(limits, daily_loss_percent=4, weekly_loss_percent=2, consecutive_losses=1)
    assert result["trading_allowed"] is False
    assert "daily_loss_limit_hit" in result["breaches"]


def test_evaluate_risk_limits_ok():
    limits = RiskLimits()
    result = evaluate_risk_limits(limits, daily_loss_percent=0.5, weekly_loss_percent=1, consecutive_losses=0)
    assert result["trading_allowed"] is True
    assert result["breaches"] == []
