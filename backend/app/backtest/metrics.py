from __future__ import annotations

import numpy as np


def compute_metrics(trade_pnls: list[float], equity_curve: list[float]) -> dict:
    if not trade_pnls:
        return {
            "win_rate": None,
            "profit_factor": None,
            "expectancy": None,
            "max_drawdown_percent": None,
            "sharpe_ratio": None,
            "average_win": None,
            "average_loss": None,
            "number_of_trades": 0,
        }

    wins = [p for p in trade_pnls if p > 0]
    losses = [p for p in trade_pnls if p <= 0]
    win_rate = round(len(wins) / len(trade_pnls) * 100, 2)
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    profit_factor = round(gross_profit / gross_loss, 3) if gross_loss > 0 else None
    expectancy = round(sum(trade_pnls) / len(trade_pnls), 4)
    average_win = round(sum(wins) / len(wins), 4) if wins else 0
    average_loss = round(sum(losses) / len(losses), 4) if losses else 0

    curve = np.array(equity_curve)
    running_max = np.maximum.accumulate(curve)
    drawdown = (curve - running_max) / np.where(running_max == 0, 1, running_max)
    max_drawdown_percent = round(float(drawdown.min()) * 100, 2) if len(drawdown) else 0

    returns = np.diff(curve) / np.where(curve[:-1] == 0, 1, curve[:-1]) if len(curve) > 1 else np.array([])
    sharpe = round(float(np.mean(returns) / np.std(returns) * np.sqrt(252)), 3) if len(returns) > 1 and np.std(returns) > 0 else None

    return {
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "expectancy": expectancy,
        "max_drawdown_percent": max_drawdown_percent,
        "sharpe_ratio": sharpe,
        "average_win": average_win,
        "average_loss": average_loss,
        "number_of_trades": len(trade_pnls),
    }
