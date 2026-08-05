"""Vectorized-ish walk-forward backtest: replays historical candles bar by
bar, running the same indicator + signal engine used live so backtest
results are representative of what the live signal engine would have done.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from app.backtest.metrics import compute_metrics
from app.indicators.engine import analyze
from app.signals.generator import generate_signal

WINDOW = 120
MAX_HOLD_BARS = 60


def run_backtest(df: pd.DataFrame, symbol: str, timeframe: str, initial_capital: float = 10_000.0) -> dict:
    if len(df) < WINDOW + 10:
        raise ValueError(f"Need at least {WINDOW + 10} candles to backtest")

    equity = initial_capital
    equity_curve = [equity]
    trade_pnls: list[float] = []
    trades_log: list[dict] = []
    open_trade = None

    for i in range(WINDOW, len(df) - 1):
        window = df.iloc[i - WINDOW : i + 1].reset_index(drop=True)
        bar = df.iloc[i]
        next_bar = df.iloc[i + 1]

        if open_trade is not None:
            direction = open_trade["direction"]
            hit_sl = (bar["low"] <= open_trade["stop_loss"]) if direction == "BUY" else (bar["high"] >= open_trade["stop_loss"])
            hit_tp = (bar["high"] >= open_trade["take_profit_1"]) if direction == "BUY" else (bar["low"] <= open_trade["take_profit_1"])
            bars_held = i - open_trade["entry_index"]

            exit_price = None
            if hit_sl:
                exit_price = open_trade["stop_loss"]
            elif hit_tp:
                exit_price = open_trade["take_profit_1"]
            elif bars_held >= MAX_HOLD_BARS:
                exit_price = bar["close"]

            if exit_price is not None:
                sign = 1 if direction == "BUY" else -1
                pnl_pct = (exit_price - open_trade["entry_price"]) / open_trade["entry_price"] * sign
                pnl = equity * open_trade["risk_percent"] / 100 * (pnl_pct / open_trade["risk_pct_price"])
                equity += pnl
                trade_pnls.append(pnl)
                trades_log.append(
                    {
                        "entry_index": open_trade["entry_index"],
                        "exit_index": i,
                        "direction": direction,
                        "entry_price": open_trade["entry_price"],
                        "exit_price": exit_price,
                        "pnl": round(pnl, 2),
                        "pnl_percent": round(pnl_pct * 100, 3),
                    }
                )
                open_trade = None

        equity_curve.append(equity)

        if open_trade is None:
            try:
                analysis = analyze(window)
            except ValueError:
                continue
            signal = generate_signal(symbol, timeframe, analysis)
            if signal:
                entry_price = float(next_bar["open"])
                risk_pct_price = abs(entry_price - signal["stop_loss"]) / entry_price
                if risk_pct_price <= 0:
                    continue
                open_trade = {
                    "direction": signal["direction"],
                    "entry_price": entry_price,
                    "stop_loss": signal["stop_loss"],
                    "take_profit_1": signal["take_profit_1"],
                    "entry_index": i + 1,
                    "risk_percent": signal["suggested_risk_percent"],
                    "risk_pct_price": risk_pct_price,
                }

    metrics = compute_metrics(trade_pnls, equity_curve)
    monthly_returns = _monthly_returns(df, trades_log)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "initial_capital": initial_capital,
        "final_capital": round(equity, 2),
        "total_return_percent": round((equity - initial_capital) / initial_capital * 100, 2),
        "metrics": metrics,
        "equity_curve": [round(v, 2) for v in equity_curve],
        "trades": trades_log[-200:],
        "monthly_returns": monthly_returns,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _monthly_returns(df: pd.DataFrame, trades_log: list[dict]) -> list[dict]:
    if not trades_log or "close_time" not in df.columns:
        return []
    buckets: dict[str, float] = {}
    for t in trades_log:
        ts = df.iloc[t["exit_index"]]["close_time"]
        month = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m")
        buckets[month] = buckets.get(month, 0) + t["pnl"]
    return [{"month": k, "pnl": round(v, 2)} for k, v in sorted(buckets.items())]
