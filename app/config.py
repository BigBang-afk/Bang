"""Central path & runtime configuration for AURUM Terminal."""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "aurum.db")
SCREENSHOTS_DIR = os.path.join(DATA_DIR, "screenshots")
BACKUPS_DIR = os.path.join(DATA_DIR, "backups")
EXPORTS_DIR = os.path.join(DATA_DIR, "exports")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

for _d in (DATA_DIR, SCREENSHOTS_DIR, BACKUPS_DIR, EXPORTS_DIR):
    os.makedirs(_d, exist_ok=True)

SYMBOL = "XAUUSD"
DEFAULT_CURRENCY = "USD"
