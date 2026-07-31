"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-31 00:00:00

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
    user_role = postgresql.ENUM("user", "admin", name="user_role")
    subscription_plan = postgresql.ENUM("free", "basic", "pro", "elite", name="subscription_plan")
    asset_type = postgresql.ENUM("forex", "commodity", "crypto", name="asset_type")
    signal_direction = postgresql.ENUM("CALL", "PUT", "NO_TRADE", name="signal_direction")
    signal_status = postgresql.ENUM(
        "PENDING_ENTRY", "ENTRY_WINDOW_CLOSED", "ACTIVE", "EXPIRING", "CHECKING_RESULT",
        "COMPLETED", "DATA_ERROR", name="signal_status",
    )
    signal_result = postgresql.ENUM("WIN", "LOSS", "DRAW", "DATA_ERROR", "PENDING", name="signal_result")
    confidence_type = postgresql.ENUM("rule_based", "ml_calibrated", name="confidence_type")
    market_condition = postgresql.ENUM(
        "strong_bullish_trend", "weak_bullish_trend", "strong_bearish_trend", "weak_bearish_trend",
        "range", "volatility_squeeze", "breakout", "high_volatility", "low_volatility", "unclear",
        name="market_condition",
    )
    backtest_status = postgresql.ENUM("pending", "running", "completed", "failed", name="backtest_status")

    bind = op.get_bind()
    for enum_type in (
        user_role, subscription_plan, asset_type, signal_direction, signal_status,
        signal_result, confidence_type, market_condition, backtest_status,
    ):
        enum_type.create(bind, checkfirst=True)
        # Already created explicitly above; prevent create_table from trying
        # to CREATE TYPE a second time when it dispatches on each column.
        enum_type.create_type = False

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="user"),
        sa.Column("subscription_plan", subscription_plan, nullable=False, server_default="free"),
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("failed_login_attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(512), nullable=False),
        sa.Column("jti", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"])

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("symbol", sa.String(32), nullable=False, unique=True),
        sa.Column("provider_symbol", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(128), nullable=False),
        sa.Column("asset_type", asset_type, nullable=False),
        sa.Column("pip_precision", sa.Integer, nullable=False, server_default="5"),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assets_symbol", "assets", ["symbol"])

    op.create_table(
        "strategies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("strategy_code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("configuration_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("supported_assets_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("supported_timeframes_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("supported_expiries_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_strategies_strategy_code", "strategies", ["strategy_code"])

    op.create_table(
        "candles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timeframe", sa.String(8), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Numeric(18, 8), nullable=False),
        sa.Column("high", sa.Numeric(18, 8), nullable=False),
        sa.Column("low", sa.Numeric(18, 8), nullable=False),
        sa.Column("close", sa.Numeric(18, 8), nullable=False),
        sa.Column("volume", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("is_complete", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("asset_id", "timeframe", "timestamp", "provider", name="uq_candle_identity"),
    )
    op.create_index("ix_candles_asset_id", "candles", ["asset_id"])
    op.create_index("ix_candles_timeframe", "candles", ["timeframe"])
    op.create_index("ix_candles_timestamp", "candles", ["timestamp"])
    op.create_index("ix_candles_asset_tf_ts", "candles", ["asset_id", "timeframe", "timestamp"])

    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("public_signal_id", sa.String(32), nullable=False, unique=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=False),
        sa.Column("direction", signal_direction, nullable=False),
        sa.Column("timeframe", sa.String(8), nullable=False),
        sa.Column("expiry_seconds", sa.Integer, nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entry_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entry_window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entry_price", sa.Numeric(18, 8), nullable=True),
        sa.Column("expiry_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expiry_price", sa.Numeric(18, 8), nullable=True),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("confidence_type", confidence_type, nullable=False),
        sa.Column("strategy_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("ml_probability", sa.Float, nullable=True),
        sa.Column("market_condition", market_condition, nullable=False),
        sa.Column("status", signal_status, nullable=False, server_default="PENDING_ENTRY"),
        sa.Column("result", signal_result, nullable=False, server_default="PENDING"),
        sa.Column("strategy_version", sa.Integer, nullable=False),
        sa.Column("model_version", sa.String(64), nullable=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("data_latency_ms", sa.Integer, nullable=False, server_default="0"),
        sa.Column("ai_auto_mode", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("supporting_strategies_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_signals_public_signal_id", "signals", ["public_signal_id"])
    op.create_index("ix_signals_asset_id", "signals", ["asset_id"])
    op.create_index("ix_signals_strategy_id", "signals", ["strategy_id"])
    op.create_index("ix_signals_generated_at", "signals", ["generated_at"])
    op.create_index("ix_signals_expiry_time", "signals", ["expiry_time"])
    op.create_index("ix_signals_status", "signals", ["status"])
    op.create_index("ix_signals_result", "signals", ["result"])

    op.create_table(
        "signal_reasons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason_code", sa.String(64), nullable=False),
        sa.Column("reason_text", sa.String(512), nullable=False),
        sa.Column("score", sa.Float, nullable=False, server_default="0"),
    )
    op.create_index("ix_signal_reasons_signal_id", "signal_reasons", ["signal_id"])

    op.create_table(
        "signal_features",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feature_name", sa.String(64), nullable=False),
        sa.Column("feature_value", sa.Float, nullable=False),
    )
    op.create_index("ix_signal_features_signal_id", "signal_features", ["signal_id"])

    op.create_table(
        "backtest_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("timeframe", sa.String(8), nullable=False),
        sa.Column("expiry_seconds", sa.Integer, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("configuration_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("metrics_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("status", backtest_status, nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_backtest_runs_strategy_id", "backtest_runs", ["strategy_id"])
    op.create_index("ix_backtest_runs_asset_id", "backtest_runs", ["asset_id"])

    op.create_table(
        "model_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("training_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("training_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("validation_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("validation_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("test_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("test_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("features_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("metrics_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("probability_threshold", sa.Float, nullable=False, server_default="0.55"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_model_versions_asset_id", "model_versions", ["asset_id"])
    op.create_index("ix_model_versions_strategy_id", "model_versions", ["strategy_id"])

    op.create_table(
        "user_strategy_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("selected_strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=True),
        sa.Column("ai_auto_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("selected_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=True),
        sa.Column("selected_timeframe", sa.String(8), nullable=False, server_default="1m"),
        sa.Column("selected_expiry_seconds", sa.Integer, nullable=False, server_default="60"),
        sa.Column("sound_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_strategy_preferences_user_id", "user_strategy_preferences", ["user_id"])

    op.create_table(
        "system_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="info"),
        sa.Column("message", sa.String(1024), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_system_events_event_type", "system_events", ["event_type"])
    op.create_index("ix_system_events_created_at", "system_events", ["created_at"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", sa.String(128), nullable=False),
        sa.Column("previous_value_json", postgresql.JSONB, nullable=True),
        sa.Column("new_value_json", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("system_events")
    op.drop_table("user_strategy_preferences")
    op.drop_table("model_versions")
    op.drop_table("backtest_runs")
    op.drop_table("signal_features")
    op.drop_table("signal_reasons")
    op.drop_table("signals")
    op.drop_table("candles")
    op.drop_table("strategies")
    op.drop_table("assets")
    op.drop_table("refresh_tokens")
    op.drop_table("users")

    bind = op.get_bind()
    for enum_name in (
        "backtest_status", "market_condition", "confidence_type", "signal_result",
        "signal_status", "signal_direction", "asset_type", "subscription_plan", "user_role",
    ):
        postgresql.ENUM(name=enum_name).drop(bind, checkfirst=True)
