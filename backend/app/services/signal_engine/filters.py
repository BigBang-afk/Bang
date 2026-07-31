"""NO TRADE filter checks shared by manual-strategy and AI-auto evaluation.

Each check returns a reason string when the condition should block signal
generation, or None when it passes. The signal engine short-circuits on the
first failing filter and always defaults to NO TRADE.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from app.core.config import settings
from app.models.strategy import Strategy
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.capabilities import available_expiries

MIN_CANDLES_REQUIRED = 210  # enough for EMA200 plus lookback buffer


def check_provider_health(provider: MarketDataProvider) -> str | None:
    if not provider.health.connected:
        return "Market data feed is disconnected."
    if provider.health.latency_ms is not None and provider.health.latency_ms > settings.max_data_latency_ms:
        return f"Feed latency {provider.health.latency_ms:.0f}ms exceeds limit {settings.max_data_latency_ms}ms."
    if provider.health.is_delayed:
        return "Market data feed is delayed."
    return None


def check_sufficient_history(df: pd.DataFrame | None) -> str | None:
    if df is None or len(df) < MIN_CANDLES_REQUIRED:
        got = 0 if df is None else len(df)
        return f"Insufficient historical data ({got}/{MIN_CANDLES_REQUIRED} candles)."
    return None


def check_missing_candle(missing_gap: bool) -> str | None:
    if missing_gap:
        return "A gap was detected in recent candle data."
    return None


def check_expiry_supported_by_provider(provider: MarketDataProvider, expiry_seconds: int) -> str | None:
    for availability in available_expiries(provider):
        if availability.seconds == expiry_seconds:
            if not availability.enabled:
                return availability.reason
            return None
    return f"Expiry {expiry_seconds}s is not a supported option."


def check_expiry_supported_by_strategy(strategy: Strategy, expiry_seconds: int) -> str | None:
    if strategy.supported_expiries_json and expiry_seconds not in strategy.supported_expiries_json:
        return f"Strategy '{strategy.strategy_code}' does not support {expiry_seconds}s expiry."
    return None


def check_timeframe_supported_by_strategy(strategy: Strategy, timeframe: str) -> str | None:
    if strategy.supported_timeframes_json and timeframe not in strategy.supported_timeframes_json:
        return f"Strategy '{strategy.strategy_code}' does not support {timeframe} timeframe."
    return None


def check_confidence_threshold(confidence: float, no_trade_below: float) -> str | None:
    if confidence < no_trade_below:
        return f"Confidence {confidence:.1f}% is below the {no_trade_below:.1f}% NO TRADE threshold."
    return None


def check_entry_window_not_passed(entry_window_end: datetime, now: datetime | None = None) -> str | None:
    now = now or datetime.now(timezone.utc)
    if now > entry_window_end:
        return "Entry window has already passed."
    return None
