"""Shared enums used across ORM models and schemas."""

import enum


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ELITE = "elite"


class AssetType(str, enum.Enum):
    FOREX = "forex"
    COMMODITY = "commodity"
    CRYPTO = "crypto"


class SignalDirection(str, enum.Enum):
    CALL = "CALL"
    PUT = "PUT"
    NO_TRADE = "NO_TRADE"


class SignalStatus(str, enum.Enum):
    PENDING_ENTRY = "PENDING_ENTRY"
    ENTRY_WINDOW_CLOSED = "ENTRY_WINDOW_CLOSED"
    ACTIVE = "ACTIVE"
    EXPIRING = "EXPIRING"
    CHECKING_RESULT = "CHECKING_RESULT"
    COMPLETED = "COMPLETED"
    DATA_ERROR = "DATA_ERROR"


class SignalResult(str, enum.Enum):
    WIN = "WIN"
    LOSS = "LOSS"
    DRAW = "DRAW"
    DATA_ERROR = "DATA_ERROR"
    PENDING = "PENDING"


class ConfidenceType(str, enum.Enum):
    RULE_BASED = "rule_based"
    ML_CALIBRATED = "ml_calibrated"


class MarketCondition(str, enum.Enum):
    STRONG_BULLISH_TREND = "strong_bullish_trend"
    WEAK_BULLISH_TREND = "weak_bullish_trend"
    STRONG_BEARISH_TREND = "strong_bearish_trend"
    WEAK_BEARISH_TREND = "weak_bearish_trend"
    RANGE = "range"
    VOLATILITY_SQUEEZE = "volatility_squeeze"
    BREAKOUT = "breakout"
    HIGH_VOLATILITY = "high_volatility"
    LOW_VOLATILITY = "low_volatility"
    UNCLEAR = "unclear"


class BacktestStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
