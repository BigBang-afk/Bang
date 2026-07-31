"""Feature engine: computes the full trend/momentum/volatility/price-action/
context feature set for the latest candle of a symbol+timeframe.

Strictly causal: every computation only uses the provided DataFrame, which
callers must truncate to the decision point (no future candles).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import pandas as pd

from app.services.features import indicators as ind
from app.services.features import price_action as pa
from app.services.features.structure import (
    break_of_structure,
    find_swing_points,
    nearest_distance,
    structure_state,
    support_resistance_levels,
)


def market_session(hour_utc: int) -> str:
    if hour_utc >= 22 or hour_utc < 7:
        return "sydney_tokyo"
    if 7 <= hour_utc < 12:
        return "london"
    if 12 <= hour_utc < 16:
        return "london_newyork_overlap"
    if 16 <= hour_utc < 21:
        return "new_york"
    return "off_session"


@dataclass
class FeatureSnapshot:
    timestamp: datetime

    # Trend
    ema_9: float
    ema_21: float
    ema_50: float
    ema_200: float
    ema_9_slope: float
    ema_21_slope: float
    structure: str
    bos: str | None
    close: float

    # Momentum
    rsi_14: float
    macd: float
    macd_signal: float
    macd_hist: float
    roc: float
    consecutive_direction: int
    body_strength: float
    body_to_range_ratio: float

    # Volatility
    atr_14: float
    atr_pct_of_price: float
    bb_upper: float
    bb_mid: float
    bb_lower: float
    bb_width: float
    avg_candle_range: float
    volatility_percentile: float
    abnormal_volatility: bool

    # Price action
    patterns: dict[str, bool]

    # Context
    support_levels: list[float]
    resistance_levels: list[float]
    distance_from_support: float | None
    distance_from_resistance: float | None
    session: str
    hour: int
    weekday: int
    feed_latency_ms: float
    missing_candle: bool
    data_points_available: int


class FeatureEngine:
    def __init__(self, swing_window: int = 3) -> None:
        self.swing_window = swing_window

    def compute(
        self, df: pd.DataFrame, feed_latency_ms: float = 0.0, missing_candle: bool = False
    ) -> FeatureSnapshot | None:
        if df is None or len(df) < 5:
            return None

        df = df.reset_index(drop=True)
        close = df["close"].astype(float)
        high = df["high"].astype(float)
        low = df["low"].astype(float)

        ema9 = ind.ema(close, 9)
        ema21 = ind.ema(close, 21)
        ema50 = ind.ema(close, 50)
        ema200 = ind.ema(close, 200)
        rsi = ind.rsi(close, 14)
        macd_line, macd_signal, macd_hist = ind.macd(close)
        atr14 = ind.atr(high, low, close, 14)
        bb_upper, bb_mid, bb_lower, bb_width = ind.bollinger_bands(close, 20, 2.0)
        roc = ind.rate_of_change(close, 10)
        vol_pct = ind.volatility_percentile(atr14, 100)

        last = df.iloc[-1]
        last_close = float(close.iloc[-1])
        candle_range = float(high.iloc[-1] - low.iloc[-1]) or 1e-9
        body = abs(float(last["close"]) - float(last["open"]))

        consecutive = 0
        direction = 0
        for i in range(len(df) - 1, -1, -1):
            row_dir = (
                1
                if df.iloc[i]["close"] > df.iloc[i]["open"]
                else (-1 if df.iloc[i]["close"] < df.iloc[i]["open"] else 0)
            )
            if row_dir == 0:
                break
            if direction == 0:
                direction = row_dir
                consecutive = 1
            elif row_dir == direction:
                consecutive += 1
            else:
                break

        swings = find_swing_points(df, self.swing_window)
        struct_state = structure_state(swings)
        bos = break_of_structure(swings, last_close)
        atr_val = float(atr14.iloc[-1]) if not pd.isna(atr14.iloc[-1]) else candle_range
        tolerance = max(atr_val * 0.5, last_close * 0.0005)
        support_levels, resistance_levels = support_resistance_levels(swings, tolerance)
        dist_support = nearest_distance([lv for lv in support_levels if lv <= last_close], last_close)
        dist_resistance = nearest_distance([lv for lv in resistance_levels if lv >= last_close], last_close)

        avg_range = float((high - low).tail(20).mean())
        atr_pct = (atr_val / last_close * 100) if last_close else 0.0
        current_vol_pct = float(vol_pct.iloc[-1]) if not pd.isna(vol_pct.iloc[-1]) else 50.0
        abnormal = current_vol_pct >= 97 or current_vol_pct <= 3

        ts = df["timestamp"].iloc[-1] if "timestamp" in df.columns else datetime.now(timezone.utc)
        if isinstance(ts, str):
            ts = pd.to_datetime(ts, utc=True).to_pydatetime()
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        return FeatureSnapshot(
            timestamp=ts,
            ema_9=float(ema9.iloc[-1]),
            ema_21=float(ema21.iloc[-1]),
            ema_50=float(ema50.iloc[-1]),
            ema_200=float(ema200.iloc[-1]) if not pd.isna(ema200.iloc[-1]) else float(ema50.iloc[-1]),
            ema_9_slope=float(ema9.iloc[-1] - ema9.iloc[-4]) if len(ema9) > 4 else 0.0,
            ema_21_slope=float(ema21.iloc[-1] - ema21.iloc[-4]) if len(ema21) > 4 else 0.0,
            structure=struct_state,
            bos=bos,
            close=last_close,
            rsi_14=float(rsi.iloc[-1]),
            macd=float(macd_line.iloc[-1]),
            macd_signal=float(macd_signal.iloc[-1]),
            macd_hist=float(macd_hist.iloc[-1]),
            roc=float(roc.iloc[-1]),
            consecutive_direction=consecutive * direction,
            body_strength=body / candle_range,
            body_to_range_ratio=body / candle_range,
            atr_14=atr_val,
            atr_pct_of_price=atr_pct,
            bb_upper=float(bb_upper.iloc[-1]) if not pd.isna(bb_upper.iloc[-1]) else last_close,
            bb_mid=float(bb_mid.iloc[-1]) if not pd.isna(bb_mid.iloc[-1]) else last_close,
            bb_lower=float(bb_lower.iloc[-1]) if not pd.isna(bb_lower.iloc[-1]) else last_close,
            bb_width=float(bb_width.iloc[-1]),
            avg_candle_range=avg_range,
            volatility_percentile=current_vol_pct,
            abnormal_volatility=abnormal,
            patterns=pa.detect_all_patterns(df),
            support_levels=support_levels,
            resistance_levels=resistance_levels,
            distance_from_support=dist_support,
            distance_from_resistance=dist_resistance,
            session=market_session(ts.hour),
            hour=ts.hour,
            weekday=ts.weekday(),
            feed_latency_ms=feed_latency_ms,
            missing_candle=missing_candle,
            data_points_available=len(df),
        )


feature_engine = FeatureEngine()
