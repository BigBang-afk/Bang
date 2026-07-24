"""Import hub so Alembic autogenerate sees all models."""
from app.db.session import Base  # noqa: F401
from app.db.models import (  # noqa: F401
    AuditLog,
    ExchangeApiKey,
    Signal,
    Subscription,
    Trade,
    User,
)
