"""Event-driven backtesting engine.

Processes historical candles strictly chronologically, feeding the feature
engine and a single strategy the same way the live signal engine does, so a
backtest can never see a future candle. Applies the same entry-window,
cooldown and expiry rules as live trading, then resolves each simulated
signal against the (already known, but never peeked-ahead) future close
price at expiry.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from app.models.enums import SignalDirection, SignalResult
from app.services.features.engine import feature_engine
from app.services.market_condition.engine import classify, is_strategy_compatible
from app.services.strategies.base import BaseStrategy

MIN_HISTORY = 210


@dataclass
class SimulatedSignal:
    index: int
    timestamp: pd.Timestamp
    direction: SignalDirection
    confidence: float
    entry_price: float
    expiry_price: float
    result: SignalResult
    market_condition: str
    session: str
    hour: int
    weekday: int


@dataclass
class BacktestMetrics:
    total_signals: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    win_rate: float = 0.0
    win_rate_excluding_draws: float = 0.0
    max_winning_streak: int = 0
    max_losing_streak: int = 0
    by_confidence_range: dict[str, dict] = field(default_factory=dict)
    by_market_condition: dict[str, dict] = field(default_factory=dict)
    by_session: dict[str, dict] = field(default_factory=dict)
    by_hour: dict[str, dict] = field(default_factory=dict)
    by_weekday: dict[str, dict] = field(default_factory=dict)
    by_month: dict[str, dict] = field(default_factory=dict)
    rolling_100_win_rate: list[float] = field(default_factory=list)
    max_drawdown_units: float = 0.0
    expected_value_per_signal: float = 0.0


def _bucket(d: dict, key: str) -> dict:
    return d.setdefault(key, {"total": 0, "wins": 0, "losses": 0, "draws": 0})


def _finalize_bucket(bucket: dict) -> None:
    for entry in bucket.values():
        decisive = entry["wins"] + entry["losses"]
        entry["win_rate"] = round(entry["wins"] / decisive * 100, 2) if decisive else 0.0


def _confidence_range_label(confidence: float) -> str:
    if confidence < 55:
        return "below_55"
    if confidence < 65:
        return "55_64"
    if confidence < 75:
        return "65_74"
    if confidence < 85:
        return "75_84"
    return "85_plus"


def run_backtest(
    candles: pd.DataFrame,
    strategy: BaseStrategy,
    strategy_code: str,
    expiry_seconds: int,
    timeframe_seconds: int,
    entry_window_seconds: int = 5,
    cooldown_seconds: int = 60,
    payout_ratio: float = 0.85,
) -> tuple[list[SimulatedSignal], BacktestMetrics]:
    """`candles` must be a chronologically sorted DataFrame with columns
    timestamp/open/high/low/close/volume. No look-ahead: at index i, only
    candles[0:i+1] are visible to the strategy."""
    candles = candles.reset_index(drop=True)
    signals: list[SimulatedSignal] = []
    last_signal_time: pd.Timestamp | None = None

    expiry_bars = max(1, round(expiry_seconds / timeframe_seconds))

    for i in range(MIN_HISTORY, len(candles) - expiry_bars):
        window = candles.iloc[: i + 1]
        current_ts = window.iloc[-1]["timestamp"]

        if last_signal_time is not None and (current_ts - last_signal_time).total_seconds() < cooldown_seconds:
            continue

        features = feature_engine.compute(window)
        if features is None:
            continue

        market_condition = classify(features)
        compatible, _ = is_strategy_compatible(strategy_code, market_condition)
        if not compatible:
            continue

        evaluation = strategy.evaluate(window, features)
        if evaluation.direction == SignalDirection.NO_TRADE or evaluation.confidence < 55:
            continue

        entry_price = float(candles.iloc[i]["close"])
        expiry_price = float(candles.iloc[i + expiry_bars]["close"])

        if expiry_price == entry_price:
            result = SignalResult.DRAW
        elif evaluation.direction == SignalDirection.CALL:
            result = SignalResult.WIN if expiry_price > entry_price else SignalResult.LOSS
        else:
            result = SignalResult.WIN if expiry_price < entry_price else SignalResult.LOSS

        signals.append(
            SimulatedSignal(
                index=i,
                timestamp=current_ts,
                direction=evaluation.direction,
                confidence=evaluation.confidence,
                entry_price=entry_price,
                expiry_price=expiry_price,
                result=result,
                market_condition=market_condition.value,
                session=features.session,
                hour=features.hour,
                weekday=features.weekday,
            )
        )
        last_signal_time = current_ts

    metrics = _compute_metrics(signals, payout_ratio)
    return signals, metrics


def _compute_metrics(signals: list[SimulatedSignal], payout_ratio: float) -> BacktestMetrics:
    metrics = BacktestMetrics()
    metrics.total_signals = len(signals)
    if not signals:
        return metrics

    metrics.wins = sum(1 for s in signals if s.result == SignalResult.WIN)
    metrics.losses = sum(1 for s in signals if s.result == SignalResult.LOSS)
    metrics.draws = sum(1 for s in signals if s.result == SignalResult.DRAW)
    decisive = metrics.wins + metrics.losses
    metrics.win_rate = round(metrics.wins / metrics.total_signals * 100, 2)
    metrics.win_rate_excluding_draws = round(metrics.wins / decisive * 100, 2) if decisive else 0.0

    cur_win = cur_lose = 0
    equity = 0.0
    peak = 0.0
    max_dd = 0.0
    rolling: list[float] = []
    window: list[int] = []

    for s in signals:
        if s.result == SignalResult.WIN:
            cur_win += 1
            cur_lose = 0
            equity += payout_ratio
            window.append(1)
        elif s.result == SignalResult.LOSS:
            cur_lose += 1
            cur_win = 0
            equity -= 1.0
            window.append(0)
        else:
            cur_win = cur_lose = 0
            window.append(0)

        metrics.max_winning_streak = max(metrics.max_winning_streak, cur_win)
        metrics.max_losing_streak = max(metrics.max_losing_streak, cur_lose)
        peak = max(peak, equity)
        max_dd = max(max_dd, peak - equity)

        if len(window) >= 100:
            recent = window[-100:]
            rolling.append(round(float(np.mean(recent)) * 100, 2))

        _bucket(metrics.by_confidence_range, _confidence_range_label(s.confidence))
        _bucket(metrics.by_market_condition, s.market_condition)
        _bucket(metrics.by_session, s.session)
        _bucket(metrics.by_hour, str(s.hour))
        _bucket(metrics.by_weekday, str(s.weekday))
        month_key = f"{s.timestamp.year}-{s.timestamp.month:02d}"
        _bucket(metrics.by_month, month_key)

        for bucket, key in (
            (metrics.by_confidence_range, _confidence_range_label(s.confidence)),
            (metrics.by_market_condition, s.market_condition),
            (metrics.by_session, s.session),
            (metrics.by_hour, str(s.hour)),
            (metrics.by_weekday, str(s.weekday)),
            (metrics.by_month, month_key),
        ):
            entry = bucket[key]
            entry["total"] += 1
            if s.result == SignalResult.WIN:
                entry["wins"] += 1
            elif s.result == SignalResult.LOSS:
                entry["losses"] += 1
            else:
                entry["draws"] += 1

    for bucket in (
        metrics.by_confidence_range,
        metrics.by_market_condition,
        metrics.by_session,
        metrics.by_hour,
        metrics.by_weekday,
        metrics.by_month,
    ):
        _finalize_bucket(bucket)

    metrics.rolling_100_win_rate = rolling
    metrics.max_drawdown_units = round(max_dd, 2)
    metrics.expected_value_per_signal = round(equity / metrics.total_signals, 4)
    return metrics
