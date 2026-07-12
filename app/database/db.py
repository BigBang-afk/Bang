"""SQLite connection management, schema bootstrap, and default seed data."""
import os
import sqlite3
import threading

from app.config import DB_PATH

_local = threading.local()

DEFAULT_STRATEGIES = [
    ("SMC", "Smart Money Concepts"),
    ("ICT", "Inner Circle Trader concepts"),
    ("Liquidity Sweep", "Stop hunt / liquidity grab reversals"),
    ("Supply & Demand", "Institutional supply/demand zone trading"),
    ("Breakout", "Range or structure breakout continuation"),
    ("Trend Following", "Momentum / trend continuation"),
    ("EMA Pullback", "Moving average retracement entries"),
    ("Order Block", "Order block mitigation entries"),
    ("Fair Value Gap", "FVG imbalance fill entries"),
]

DEFAULT_TAGS = [
    ("Liquidity Sweep", "Price Action"), ("BOS", "Structure"), ("CHOCH", "Structure"),
    ("OB", "Price Action"), ("Breaker", "Price Action"), ("Mitigation", "Price Action"),
    ("FVG", "Price Action"), ("Premium", "Zone"), ("Discount", "Zone"),
    ("Equal Highs", "Liquidity"), ("Equal Lows", "Liquidity"), ("Trendline", "Technical"),
    ("Range", "Market Type"), ("Scalp", "Style"), ("Intraday", "Style"), ("Swing", "Style"),
]

DEFAULT_ACHIEVEMENTS = [
    ("first_trade", "First Blood", "Log your first XAUUSD trade", "🥇"),
    ("win_30", "Sharp Shooter", "Achieve 30 winning trades", "🎯"),
    ("trades_100", "Century", "Log 100 total trades", "💯"),
    ("trades_1000", "Veteran", "Log 1000 total trades", "🏆"),
    ("10r_day", "10R Day", "Close a single day with 10R or more", "🚀"),
    ("no_rule_break", "Iron Discipline", "30 consecutive trades following your plan", "🛡️"),
    ("perfect_week", "Perfect Week", "A fully green trading week", "✨"),
    ("consistency", "Consistency Badge", "Positive P/L in 4 consecutive weeks", "📈"),
]

DEFAULT_SETTINGS = {
    "theme": "dark",
    "font_size": "13",
    "currency": "USD",
    "timezone": "UTC",
    "auto_save": "1",
    "language": "English",
    "active_account_id": "",
    "daily_target": "0",
    "weekly_target": "0",
    "monthly_target": "0",
}


def get_connection() -> sqlite3.Connection:
    """Thread-local SQLite connection with sane pragmas."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        _local.conn = conn
    return conn


def close_connection():
    """Closes and drops the current thread's connection so the next get_connection() reopens it."""
    conn = getattr(_local, "conn", None)
    if conn is not None:
        conn.close()
        _local.conn = None


def init_db():
    """Create schema (idempotent) and seed defaults if the DB is fresh."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    conn = get_connection()
    conn.executescript(schema_sql)
    conn.commit()
    _seed_defaults(conn)


def _seed_defaults(conn: sqlite3.Connection):
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM strategies")
    if cur.fetchone()[0] == 0:
        cur.executemany("INSERT INTO strategies (name, description) VALUES (?, ?)", DEFAULT_STRATEGIES)

    cur.execute("SELECT COUNT(*) FROM tags")
    if cur.fetchone()[0] == 0:
        cur.executemany("INSERT INTO tags (name, category) VALUES (?, ?)", DEFAULT_TAGS)

    cur.execute("SELECT COUNT(*) FROM achievements")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO achievements (key, name, description, icon) VALUES (?, ?, ?, ?)",
            DEFAULT_ACHIEVEMENTS,
        )

    cur.execute("SELECT COUNT(*) FROM accounts")
    if cur.fetchone()[0] == 0:
        cur.execute(
            """INSERT INTO accounts (name, broker, starting_balance, current_balance, currency,
               leverage, target, max_daily_loss, max_overall_loss, risk_percent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("Personal", "Exness", 10000.0, 10000.0, "USD", "1:100", 20.0, 5.0, 10.0, 1.0),
        )

    cur.execute("SELECT COUNT(*) FROM security")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO security (id, security_enabled) VALUES (1, 0)")

    for k, v in DEFAULT_SETTINGS.items():
        cur.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()
