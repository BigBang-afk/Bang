import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExchangeApiKey(Base):
    """Stores MEXC API credentials, encrypted at rest via Fernet (see core.security)."""

    __tablename__ = "exchange_api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    exchange: Mapped[str] = mapped_column(String(50), default="mexc")
    label: Mapped[str] = mapped_column(String(100), default="default")

    encrypted_api_key: Mapped[str] = mapped_column(String(1024))
    encrypted_api_secret: Mapped[str] = mapped_column(String(1024))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    read_only: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
