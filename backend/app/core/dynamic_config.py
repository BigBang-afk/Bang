"""Admin-editable runtime configuration, persisted in Redis so changes made
from the admin panel take effect immediately without a redeploy.

Only confidence thresholds are exposed here today (per spec: "Make
thresholds editable from the admin panel"); the pattern generalizes to any
future runtime-tunable value.
"""

from __future__ import annotations

import orjson

from app.db.redis import get_redis

_CONFIDENCE_THRESHOLDS_KEY = "config:confidence_thresholds"

DEFAULT_CONFIDENCE_THRESHOLDS = {
    "no_trade_below": 55.0,
    "weak_max": 64.99,
    "moderate_max": 74.99,
    "strong_max": 84.99,
    # 85+ is "very strong"
}


async def get_confidence_thresholds() -> dict[str, float]:
    redis = get_redis()
    raw = await redis.get(_CONFIDENCE_THRESHOLDS_KEY)
    if not raw:
        return dict(DEFAULT_CONFIDENCE_THRESHOLDS)
    try:
        stored = orjson.loads(raw)
        return {**DEFAULT_CONFIDENCE_THRESHOLDS, **stored}
    except orjson.JSONDecodeError:
        return dict(DEFAULT_CONFIDENCE_THRESHOLDS)


async def set_confidence_thresholds(values: dict[str, float]) -> dict[str, float]:
    redis = get_redis()
    merged = {**(await get_confidence_thresholds()), **values}
    await redis.set(_CONFIDENCE_THRESHOLDS_KEY, orjson.dumps(merged).decode())
    return merged


_SIGNAL_ENGINE_PAUSED_KEY = "config:signal_engine_paused"


async def is_signal_engine_paused() -> bool:
    redis = get_redis()
    value = await redis.get(_SIGNAL_ENGINE_PAUSED_KEY)
    return value == "1"


async def set_signal_engine_paused(paused: bool) -> None:
    redis = get_redis()
    await redis.set(_SIGNAL_ENGINE_PAUSED_KEY, "1" if paused else "0")


def confidence_label(confidence: float, thresholds: dict[str, float]) -> str:
    if confidence < thresholds["no_trade_below"]:
        return "no_trade"
    if confidence <= thresholds["weak_max"]:
        return "weak"
    if confidence <= thresholds["moderate_max"]:
        return "moderate"
    if confidence <= thresholds["strong_max"]:
        return "strong"
    return "very_strong"
