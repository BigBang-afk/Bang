"""Unicode glyph icon set (keeps the app dependency-free of icon binaries)."""

ICONS = {
    "dashboard": "◆",
    "accounts": "🏦",
    "trade_entry": "✎",
    "trade_log": "☰",
    "strategies": "♟",
    "tags": "🏷",
    "risk": "⚠",
    "statistics": "📊",
    "chart": "📈",
    "calendar": "🗓",
    "reports": "🗎",
    "backup": "⟲",
    "settings": "⚙",
    "security": "🔒",
    "ai": "✦",
    "achievements": "🏆",
    "goals": "🎯",
    "notifications": "🔔",
    "logout": "⏻",
    "gold": "●",
    "up": "▲",
    "down": "▼",
    "close": "✕",
    "add": "＋",
    "edit": "✎",
    "delete": "🗑",
    "search": "🔍",
    "filter": "▤",
    "export": "⇩",
    "buy": "▲",
    "sell": "▼",
}


def icon(name):
    return ICONS.get(name, "•")
