"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

user_role = postgresql.ENUM("admin", "trader", "viewer", name="userrole")
trade_side = postgresql.ENUM("long", "short", name="tradeside")
trade_status = postgresql.ENUM("open", "closed", "cancelled", name="tradestatus")
signal_direction = postgresql.ENUM("long", "short", name="signaldirection")
signal_status = postgresql.ENUM("active", "invalidated", "tp_hit", "sl_hit", "expired", name="signalstatus")
subscription_status = postgresql.ENUM("active", "cancelled", "expired", "past_due", name="subscriptionstatus")


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    trade_side.create(bind, checkfirst=True)
    trade_status.create(bind, checkfirst=True)
    signal_direction.create(bind, checkfirst=True)
    signal_status.create(bind, checkfirst=True)
    subscription_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", user_role, nullable=False, server_default="trader"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("totp_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("subscription_tier", sa.String(50), nullable=False, server_default="free"),
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "exchange_api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exchange", sa.String(50), nullable=False, server_default="mexc"),
        sa.Column("label", sa.String(100), nullable=False, server_default="default"),
        sa.Column("encrypted_api_key", sa.String(1024), nullable=False),
        sa.Column("encrypted_api_secret", sa.String(1024), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("read_only", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_exchange_api_keys_user_id", "exchange_api_keys", ["user_id"])

    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("direction", signal_direction, nullable=False),
        sa.Column("status", signal_status, nullable=False, server_default="active"),
        sa.Column("trading_mode", sa.String(20), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("entry_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("stop_loss", sa.Numeric(20, 8), nullable=False),
        sa.Column("take_profit_1", sa.Numeric(20, 8), nullable=False),
        sa.Column("take_profit_2", sa.Numeric(20, 8), nullable=False),
        sa.Column("take_profit_3", sa.Numeric(20, 8), nullable=False),
        sa.Column("invalidation_level", sa.Numeric(20, 8), nullable=False),
        sa.Column("risk_reward_ratio", sa.Numeric(10, 4), nullable=False),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("score_breakdown", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("reasons", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("market_structure_summary", sa.Text, nullable=False, server_default=""),
        sa.Column("expected_scenario", sa.Text, nullable=False, server_default=""),
        sa.Column("estimated_holding_time", sa.String(50), nullable=False, server_default=""),
        sa.Column("higher_timeframe_confirmed", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_signals_symbol", "signals", ["symbol"])

    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("exchange_order_id", sa.String(100), nullable=True),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("side", trade_side, nullable=False),
        sa.Column("status", trade_status, nullable=False, server_default="open"),
        sa.Column("entry_price", sa.Numeric(20, 8), nullable=False),
        sa.Column("exit_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("stop_loss", sa.Numeric(20, 8), nullable=True),
        sa.Column("take_profit_1", sa.Numeric(20, 8), nullable=True),
        sa.Column("take_profit_2", sa.Numeric(20, 8), nullable=True),
        sa.Column("take_profit_3", sa.Numeric(20, 8), nullable=True),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("leverage", sa.Numeric(10, 2), nullable=False, server_default="1"),
        sa.Column("risk_percent", sa.Numeric(6, 3), nullable=False),
        sa.Column("risk_reward_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("pnl", sa.Numeric(20, 8), nullable=True),
        sa.Column("pnl_percent", sa.Numeric(10, 4), nullable=True),
        sa.Column("fees", sa.Numeric(20, 8), nullable=True),
        sa.Column("trading_mode", sa.String(20), nullable=False, server_default="intraday"),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("screenshot_url", sa.String(500), nullable=True),
        sa.Column("mistakes", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("reasons", sa.Text, nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_trades_user_id", "trades", ["user_id"])
    op.create_index("ix_trades_symbol", "trades", ["symbol"])

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tier", sa.String(50), nullable=False),
        sa.Column("status", subscription_status, nullable=False, server_default="active"),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("billing_cycle", sa.String(20), nullable=False, server_default="monthly"),
        sa.Column("payment_provider", sa.String(50), nullable=True),
        sa.Column("payment_reference", sa.String(255), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(100), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("detail", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("subscriptions")
    op.drop_table("trades")
    op.drop_table("signals")
    op.drop_table("exchange_api_keys")
    op.drop_table("users")

    bind = op.get_bind()
    subscription_status.drop(bind, checkfirst=True)
    signal_status.drop(bind, checkfirst=True)
    signal_direction.drop(bind, checkfirst=True)
    trade_status.drop(bind, checkfirst=True)
    trade_side.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
