"""Flattens a FeatureSnapshot into the fixed numeric feature vector used by
the ML pipeline. Keeping this list versioned (FEATURE_NAMES) lets
ModelVersion.features_json record exactly what a trained model expects,
which the inference path checks before ever using a model."""

from __future__ import annotations

from app.services.features.engine import FeatureSnapshot

FEATURE_NAMES: list[str] = [
    "ema_9",
    "ema_21",
    "ema_50",
    "ema_200",
    "ema_9_slope",
    "ema_21_slope",
    "rsi_14",
    "macd",
    "macd_signal",
    "macd_hist",
    "roc",
    "consecutive_direction",
    "body_strength",
    "body_to_range_ratio",
    "atr_14",
    "atr_pct_of_price",
    "bb_width",
    "avg_candle_range",
    "volatility_percentile",
    "distance_from_support",
    "distance_from_resistance",
    "hour",
    "weekday",
]


def to_feature_vector(features: FeatureSnapshot) -> list[float]:
    values = {
        "ema_9": features.ema_9,
        "ema_21": features.ema_21,
        "ema_50": features.ema_50,
        "ema_200": features.ema_200,
        "ema_9_slope": features.ema_9_slope,
        "ema_21_slope": features.ema_21_slope,
        "rsi_14": features.rsi_14,
        "macd": features.macd,
        "macd_signal": features.macd_signal,
        "macd_hist": features.macd_hist,
        "roc": features.roc,
        "consecutive_direction": features.consecutive_direction,
        "body_strength": features.body_strength,
        "body_to_range_ratio": features.body_to_range_ratio,
        "atr_14": features.atr_14,
        "atr_pct_of_price": features.atr_pct_of_price,
        "bb_width": features.bb_width,
        "avg_candle_range": features.avg_candle_range,
        "volatility_percentile": features.volatility_percentile,
        "distance_from_support": features.distance_from_support or 0.0,
        "distance_from_resistance": features.distance_from_resistance or 0.0,
        "hour": features.hour,
        "weekday": features.weekday,
    }
    return [float(values[name]) for name in FEATURE_NAMES]
