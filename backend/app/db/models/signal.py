import enum
import uuid

from sqlalchemy import JSON, Enum, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SignalDirection(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class SignalStatus(str, enum.Enum):
    ACTIVE = "active"
    INVALIDATED = "invalidated"
    TP1_HIT = "tp1_hit"
    TP2_HIT = "tp2_hit"
    TP3_HIT = "tp3_hit"
    SL_HIT = "sl_hit"
    EXPIRED = "expired"


class Signal(Base, TimestampMixin):
    __tablename__ = "signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    market: Mapped[str] = mapped_column(String(16), default="spot")  # spot | futures
    timeframe: Mapped[str] = mapped_column(String(8), default="15m")
    direction: Mapped[SignalDirection] = mapped_column(Enum(SignalDirection), nullable=False)
    status: Mapped[SignalStatus] = mapped_column(Enum(SignalStatus), default=SignalStatus.ACTIVE)

    entry_low: Mapped[float] = mapped_column(Float, nullable=False)
    entry_high: Mapped[float] = mapped_column(Float, nullable=False)
    stop_loss: Mapped[float] = mapped_column(Float, nullable=False)
    take_profit_1: Mapped[float] = mapped_column(Float, nullable=False)
    take_profit_2: Mapped[float] = mapped_column(Float, nullable=False)
    take_profit_3: Mapped[float] = mapped_column(Float, nullable=False)
    risk_reward_ratio: Mapped[float] = mapped_column(Float, nullable=False)

    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    reasons: Mapped[list] = mapped_column(JSON, default=list)

    expected_holding_minutes: Mapped[int] = mapped_column(Integer, default=60)
    suggested_leverage_min: Mapped[float] = mapped_column(Float, default=1.0)
    suggested_leverage_max: Mapped[float] = mapped_column(Float, default=3.0)
    suggested_risk_percent: Mapped[float] = mapped_column(Float, default=1.0)

    mtf_confluence: Mapped[dict] = mapped_column(JSON, default=dict)
