import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SignalDirection(str, enum.Enum):
    LONG = "long"
    SHORT = "short"


class SignalStatus(str, enum.Enum):
    ACTIVE = "active"
    INVALIDATED = "invalidated"
    TP_HIT = "tp_hit"
    SL_HIT = "sl_hit"
    EXPIRED = "expired"


class Signal(Base):
    """An AI-generated trading opportunity with full confidence breakdown, immutable once created."""

    __tablename__ = "signals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    symbol: Mapped[str] = mapped_column(String(50), index=True)
    direction: Mapped[SignalDirection] = mapped_column(
        Enum(SignalDirection, values_callable=lambda enum_cls: [e.value for e in enum_cls])
    )
    status: Mapped[SignalStatus] = mapped_column(
        Enum(SignalStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=SignalStatus.ACTIVE,
    )

    trading_mode: Mapped[str] = mapped_column(String(20))  # scalping | intraday
    timeframe: Mapped[str] = mapped_column(String(10))

    entry_price: Mapped[float] = mapped_column(Numeric(20, 8))
    stop_loss: Mapped[float] = mapped_column(Numeric(20, 8))
    take_profit_1: Mapped[float] = mapped_column(Numeric(20, 8))
    take_profit_2: Mapped[float] = mapped_column(Numeric(20, 8))
    take_profit_3: Mapped[float] = mapped_column(Numeric(20, 8))
    invalidation_level: Mapped[float] = mapped_column(Numeric(20, 8))

    risk_reward_ratio: Mapped[float] = mapped_column(Numeric(10, 4))
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 2))

    # Breakdown of the weighted confidence score, e.g. {"trend": 82, "structure": 75, "smc": 90, ...}
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)

    reasons: Mapped[list] = mapped_column(JSON, default=list)
    market_structure_summary: Mapped[str] = mapped_column(Text, default="")
    expected_scenario: Mapped[str] = mapped_column(Text, default="")
    estimated_holding_time: Mapped[str] = mapped_column(String(50), default="")

    higher_timeframe_confirmed: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
