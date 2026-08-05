"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", sa.Enum("admin", "trader", "viewer", name="userrole"), nullable=False, server_default="trader"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_2fa_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("mexc_api_key_encrypted", sa.String(512), nullable=True),
        sa.Column("mexc_api_secret_encrypted", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("market", sa.String(16), nullable=False, server_default="spot"),
        sa.Column("timeframe", sa.String(8), nullable=False, server_default="15m"),
        sa.Column("direction", sa.Enum("BUY", "SELL", name="signaldirection"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "invalidated", "tp1_hit", "tp2_hit", "tp3_hit", "sl_hit", "expired", name="signalstatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("entry_low", sa.Float, nullable=False),
        sa.Column("entry_high", sa.Float, nullable=False),
        sa.Column("stop_loss", sa.Float, nullable=False),
        sa.Column("take_profit_1", sa.Float, nullable=False),
        sa.Column("take_profit_2", sa.Float, nullable=False),
        sa.Column("take_profit_3", sa.Float, nullable=False),
        sa.Column("risk_reward_ratio", sa.Float, nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column("confidence_breakdown", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("reasons", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("expected_holding_minutes", sa.Integer, nullable=False, server_default="60"),
        sa.Column("suggested_leverage_min", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("suggested_leverage_max", sa.Float, nullable=False, server_default="3.0"),
        sa.Column("suggested_risk_percent", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("mtf_confluence", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_signals_symbol", "signals", ["symbol"])

    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signals.id"), nullable=True),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("side", sa.Enum("long", "short", name="tradeside"), nullable=False),
        sa.Column("entry_price", sa.Float, nullable=False),
        sa.Column("exit_price", sa.Float, nullable=True),
        sa.Column("quantity", sa.Float, nullable=False),
        sa.Column("leverage", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("stop_loss", sa.Float, nullable=True),
        sa.Column("take_profit", sa.Float, nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pnl", sa.Float, nullable=True),
        sa.Column("pnl_percent", sa.Float, nullable=True),
        sa.Column("confidence_at_entry", sa.Float, nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("mistakes", sa.Text, nullable=True),
        sa.Column("lessons", sa.Text, nullable=True),
        sa.Column("screenshots", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("tags", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_journal_entries_user_id", "journal_entries", ["user_id"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(32), nullable=False),
        sa.Column("list_name", sa.String(64), nullable=False, server_default="default"),
        sa.Column("pinned", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_watchlist_items_user_id", "watchlist_items", ["user_id"])

    op.create_table(
        "alert_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(32), nullable=True),
        sa.Column(
            "condition",
            sa.Enum("price_above", "price_below", "new_signal", "confidence_above", "volatility_spike", name="alertcondition"),
            nullable=False,
        ),
        sa.Column("threshold", sa.Float, nullable=True),
        sa.Column("channels", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_alert_rules_user_id", "alert_rules", ["user_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource", sa.String(128), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("metadata", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("alert_rules")
    op.drop_table("watchlist_items")
    op.drop_table("journal_entries")
    op.drop_table("signals")
    op.drop_table("users")
    for enum_name in ("userrole", "signaldirection", "signalstatus", "tradeside", "alertcondition"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
