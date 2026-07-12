-- XAUUSD Portfolio Terminal - SQLite Schema
-- Normalized, indexed schema dedicated to gold (XAUUSD) trade journaling & analytics.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL UNIQUE,
    broker              TEXT DEFAULT '',
    starting_balance    REAL NOT NULL DEFAULT 0,
    current_balance     REAL NOT NULL DEFAULT 0,
    currency            TEXT NOT NULL DEFAULT 'USD',
    leverage            TEXT DEFAULT '1:100',
    target              REAL DEFAULT 0,
    max_daily_loss      REAL DEFAULT 0,
    max_overall_loss    REAL DEFAULT 0,
    risk_percent        REAL DEFAULT 1.0,
    is_active           INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS strategies (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL UNIQUE,
    description         TEXT DEFAULT '',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL UNIQUE,
    category            TEXT DEFAULT 'General',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_uid           TEXT NOT NULL UNIQUE,
    account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    strategy_id         INTEGER REFERENCES strategies(id) ON DELETE SET NULL,
    trade_date          TEXT NOT NULL,
    trade_time          TEXT NOT NULL DEFAULT '00:00',
    direction            TEXT NOT NULL CHECK(direction IN ('Buy','Sell')),
    entry_price         REAL NOT NULL DEFAULT 0,
    stop_loss           REAL DEFAULT 0,
    take_profit         REAL DEFAULT 0,
    exit_price          REAL DEFAULT 0,
    lot_size            REAL NOT NULL DEFAULT 0.01,
    risk_percent        REAL DEFAULT 1.0,
    rr_ratio            REAL DEFAULT 0,
    commission          REAL DEFAULT 0,
    swap                REAL DEFAULT 0,
    spread              REAL DEFAULT 0,
    profit_loss         REAL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Closed','Partial','Breakeven')),
    open_time            TEXT DEFAULT '',
    close_time           TEXT DEFAULT '',
    screenshot_before    TEXT DEFAULT '',
    screenshot_after      TEXT DEFAULT '',
    notes                TEXT DEFAULT '',
    reason_entry          TEXT DEFAULT '',
    reason_exit           TEXT DEFAULT '',
    mistakes              TEXT DEFAULT '',
    lessons_learned        TEXT DEFAULT '',
    emotion_before         TEXT DEFAULT '',
    emotion_during         TEXT DEFAULT '',
    emotion_after          TEXT DEFAULT '',
    confidence_score       INTEGER DEFAULT 5,
    patience_score         INTEGER DEFAULT 5,
    discipline_score       INTEGER DEFAULT 5,
    followed_plan          INTEGER DEFAULT 1,
    news_impact             TEXT DEFAULT 'None',
    session                  TEXT DEFAULT 'London' CHECK(session IN ('London','New York','Asian','Kill Zone')),
    created_at               TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_tags (
    trade_id            INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    tag_id               INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (trade_id, tag_id)
);

CREATE TABLE IF NOT EXISTS goals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id          INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    period               TEXT NOT NULL CHECK(period IN ('Daily','Weekly','Monthly','Quarterly','Yearly')),
    target_amount        REAL NOT NULL DEFAULT 0,
    start_date            TEXT NOT NULL,
    end_date              TEXT NOT NULL,
    created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    key                  TEXT NOT NULL UNIQUE,
    name                  TEXT NOT NULL,
    description            TEXT DEFAULT '',
    icon                   TEXT DEFAULT '',
    unlocked                INTEGER NOT NULL DEFAULT 0,
    unlocked_at              TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    ntype                TEXT NOT NULL DEFAULT 'info',
    title                 TEXT NOT NULL,
    message                TEXT DEFAULT '',
    is_read                 INTEGER NOT NULL DEFAULT 0,
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_notes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    note_date            TEXT NOT NULL,
    note_type             TEXT NOT NULL DEFAULT 'General' CHECK(note_type IN ('News','Holiday','General')),
    note                   TEXT DEFAULT '',
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chart_annotations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id             INTEGER REFERENCES trades(id) ON DELETE CASCADE,
    title                 TEXT DEFAULT 'Chart',
    image_path            TEXT DEFAULT '',
    annotation_json        TEXT DEFAULT '[]',
    created_at               TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key                 TEXT PRIMARY KEY,
    value                 TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS security (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),
    pin_hash             TEXT DEFAULT '',
    password_hash         TEXT DEFAULT '',
    salt                   TEXT DEFAULT '',
    auto_logout_minutes     INTEGER DEFAULT 15,
    security_enabled         INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS backups (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path             TEXT NOT NULL,
    size_bytes             INTEGER DEFAULT 0,
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_direction ON trades(direction);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag ON trade_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_date ON calendar_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
