import enum
import uuid

from sqlalchemy import JSON, Boolean, Enum, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AlertChannel(str, enum.Enum):
    WEBSITE = "website"
    EMAIL = "email"
    TELEGRAM = "telegram"
    DISCORD = "discord"
    PUSH = "push"
    SOUND = "sound"


class AlertCondition(str, enum.Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    NEW_SIGNAL = "new_signal"
    CONFIDENCE_ABOVE = "confidence_above"
    VOLATILITY_SPIKE = "volatility_spike"


class AlertRule(Base, TimestampMixin):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    symbol: Mapped[str | None] = mapped_column(String(32), nullable=True)
    condition: Mapped[AlertCondition] = mapped_column(Enum(AlertCondition), nullable=False)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    channels: Mapped[list] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
