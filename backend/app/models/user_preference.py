import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserStrategyPreference(Base):
    __tablename__ = "user_strategy_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    selected_strategy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("strategies.id"), nullable=True)
    ai_auto_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    selected_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    selected_timeframe: Mapped[str] = mapped_column(String(8), default="1m", nullable=False)
    selected_expiry_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
