"""Single source of truth for server time used by countdown synchronization."""

from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
