import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ConfidenceType, MarketCondition, SignalDirection, SignalResult, SignalStatus


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_signal_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id"), index=True, nullable=False)
    strategy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("strategies.id"), index=True, nullable=False)
    direction: Mapped[SignalDirection] = mapped_column(
        Enum(SignalDirection, name="signal_direction", values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    timeframe: Mapped[str] = mapped_column(String(8), nullable=False)
    expiry_seconds: Mapped[int] = mapped_column(Integer, nullable=False)

    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    entry_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    entry_price: Mapped[float | None] = mapped_column(Numeric(18, 8), nullable=True)
    expiry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    expiry_price: Mapped[float | None] = mapped_column(Numeric(18, 8), nullable=True)

    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_type: Mapped[ConfidenceType] = mapped_column(
        Enum(ConfidenceType, name="confidence_type", values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    strategy_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ml_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_condition: Mapped[MarketCondition] = mapped_column(
        Enum(MarketCondition, name="market_condition", values_callable=lambda x: [e.value for e in x]), nullable=False
    )

    status: Mapped[SignalStatus] = mapped_column(
        Enum(SignalStatus, name="signal_status", values_callable=lambda x: [e.value for e in x]),
        default=SignalStatus.PENDING_ENTRY,
        nullable=False,
        index=True,
    )
    result: Mapped[SignalResult] = mapped_column(
        Enum(SignalResult, name="signal_result", values_callable=lambda x: [e.value for e in x]),
        default=SignalResult.PENDING,
        nullable=False,
        index=True,
    )

    strategy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    data_latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    ai_auto_mode: Mapped[bool] = mapped_column(default=False, nullable=False)
    supporting_strategies_json: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    reasons: Mapped[list["SignalReason"]] = relationship(back_populates="signal", cascade="all, delete-orphan")
    features: Mapped[list["SignalFeature"]] = relationship(back_populates="signal", cascade="all, delete-orphan")


class SignalReason(Base):
    __tablename__ = "signal_reasons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("signals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reason_code: Mapped[str] = mapped_column(String(64), nullable=False)
    reason_text: Mapped[str] = mapped_column(String(512), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    signal: Mapped["Signal"] = relationship(back_populates="reasons")


class SignalFeature(Base):
    __tablename__ = "signal_features"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("signals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    feature_name: Mapped[str] = mapped_column(String(64), nullable=False)
    feature_value: Mapped[float] = mapped_column(Float, nullable=False)

    signal: Mapped["Signal"] = relationship(back_populates="features")
