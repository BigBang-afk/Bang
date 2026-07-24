import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TradeSide(str, enum.Enum):
    LONG = "long"
    SHORT = "short"


class TradeStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class Trade(Base):
    """Represents an executed / journaled trade, whether placed via the platform or imported from MEXC history."""

    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    signal_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("signals.id", ondelete="SET NULL"), nullable=True)

    exchange_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    side: Mapped[TradeSide] = mapped_column(Enum(TradeSide, values_callable=lambda enum_cls: [e.value for e in enum_cls]))
    status: Mapped[TradeStatus] = mapped_column(
        Enum(TradeStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=TradeStatus.OPEN,
    )

    entry_price: Mapped[float] = mapped_column(Numeric(20, 8))
    exit_price: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    stop_loss: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit_1: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit_2: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit_3: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)

    quantity: Mapped[float] = mapped_column(Numeric(20, 8))
    leverage: Mapped[float] = mapped_column(Numeric(10, 2), default=1)
    risk_percent: Mapped[float] = mapped_column(Numeric(6, 3))
    risk_reward_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    pnl: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)
    pnl_percent: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    fees: Mapped[float | None] = mapped_column(Numeric(20, 8), nullable=True)

    trading_mode: Mapped[str] = mapped_column(String(20), default="intraday")
    timeframe: Mapped[str] = mapped_column(String(10))

    screenshot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mistakes: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reasons: Mapped[str | None] = mapped_column(Text, nullable=True)

    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
