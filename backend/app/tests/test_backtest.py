from app.backtest.engine import run_backtest


def test_run_backtest_produces_metrics(uptrend_df):
    result = run_backtest(uptrend_df, "BTCUSDT", "1m", initial_capital=10_000)
    assert result["symbol"] == "BTCUSDT"
    assert "metrics" in result
    assert len(result["equity_curve"]) > 0
    assert result["initial_capital"] == 10_000


def test_run_backtest_requires_minimum_candles(uptrend_df):
    import pytest

    with pytest.raises(ValueError):
        run_backtest(uptrend_df.head(50), "BTCUSDT", "1m")
