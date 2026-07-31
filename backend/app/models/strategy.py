import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Strategy(Base, TimestampMixin):
    __tablename__ = "strategies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    configuration_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    supported_assets_json: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    supported_timeframes_json: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    supported_expiries_json: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
