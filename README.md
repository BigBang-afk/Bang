# AURUM Terminal — XAUUSD Portfolio & Risk Terminal

A modern desktop portfolio, trade journal, analytics and risk management
suite dedicated exclusively to **XAUUSD (Gold)** trading. Built with Python,
CustomTkinter and SQLite in a black-and-gold institutional design —
Bloomberg Terminal meets TradingView.

**This is not a broker.** It does not place, route, or manage live orders.
It is a local-only portfolio management, journaling, analytics and risk
tool that sits alongside your broker platform.

## Features

- **Dashboard** — 24 live KPIs, equity/balance curves, monthly calendar
  heatmap, daily performance chart, risk meter & performance gauge.
- **Multi-account management** — FTMO, Exness, IC Markets, FundedNext,
  Personal, or any custom account, each with its own balance, targets and
  loss limits.
- **Trade entry & journal** — full execution details plus psychology
  tracking (confidence/patience/discipline scores, emotions, reasons,
  mistakes, lessons), setup tags, before/after screenshots, and duplicate
  detection.
- **Trade log** — sortable table with search-by and filter-by (direction,
  status, session, strategy, date range, winners/losers).
- **Strategy manager & setup tags** — unlimited strategies with live
  win-rate/RR/profit/best-hour stats; SMC/ICT-style tag library.
- **Risk management desk** — position size & risk calculator, daily/weekly/
  overall loss limits, drawdown tracking, consecutive-loss auto warnings,
  risk meter.
- **Statistics** — Sharpe, Sortino, Kelly %, profit factor, recovery
  factor, expectancy, streaks, and session/day/hour breakdowns.
- **Chart analysis** — annotate stored chart screenshots with trendlines,
  support/resistance, supply/demand, order blocks, FVGs, liquidity and
  labels; zoom & fullscreen editor.
- **Trading calendar** — profit/loss heatmap with daily notes, economic
  news and holiday markers.
- **Reports** — daily/weekly/monthly/yearly reports, exportable to PDF,
  Excel and CSV, plus print.
- **Backup & restore** — manual/automatic backups, optional AES (Fernet)
  password encryption, and a database integrity health check.
- **Settings & Security** — theme, font size, currency, timezone,
  language, PIN/password lock with auto-logout.
- **AI Analysis** — a transparent, rule-based insight engine that surfaces
  repeated mistakes, best/worst setups, timing edges, psychology patterns
  and strategy comparisons.
- **Achievements & Goals** — milestone badges and daily/weekly/monthly/
  quarterly/yearly target tracking with progress bars.
- **Notifications** — journal reminders, risk warnings, and target-achieved
  alerts.

## Tech stack

- Python 3.11+ (needs a Tk-enabled interpreter — see below)
- [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) for the UI
- SQLite (via the standard library `sqlite3`) for storage
- `matplotlib` for embedded charts, `Pillow` for images
- `reportlab` / `openpyxl` for PDF / Excel export
- `cryptography` for optional encrypted backups

## Getting started

Tkinter is not bundled with every Python distribution. On Debian/Ubuntu:

```bash
sudo apt-get install python3-tk
```

Then set up a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate      # .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Run the app:

```bash
python main.py
```

On first launch, a local SQLite database is created at `data/aurum.db`
with a starter "Personal" account, a default strategy library (SMC, ICT,
Liquidity Sweep, Supply & Demand, Breakout, Trend Following, EMA Pullback,
Order Block, Fair Value Gap) and a default setup-tag library.

### Opening in Visual Studio

`AurumTerminal.sln` + `AurumTerminal.pyproj` are included for Visual Studio's
**Python Development** workload (Visual Studio Installer → Workloads →
Python development). Steps:

1. Install the Python Development workload if you haven't already.
2. Open `AurumTerminal.sln` in Visual Studio.
3. In Solution Explorer, right-click **Python Environments** → *Add
   Environment...* and point it at a virtual environment created from
   `requirements.txt` (or right-click the project → *Create Virtual
   Environment*, then `pip install -r requirements.txt` in the VS Python
   Environments window). Make sure Python's Tk/Tcl support is installed —
   the standard python.org Windows installer includes it by default.
4. Set the new environment as the active one for the project, then press
   **F5** (or Ctrl+F5) to run — `main.py` is already set as the startup file.

If Visual Studio offers to "make non-functional changes to this project in
order to enable [it] to open in released versions of Visual Studio newer
than Visual Studio 2010 SP1" — that's just VS's one-time, harmless project
upgrade prompt for older-style `.pyproj` files. Click OK; it does not
change any app behavior. (The project file already declares
`ToolsVersion="4.0"`, so current versions of Visual Studio should not show
this prompt at all.)

### Building a standalone .exe

PyInstaller builds a native executable for whatever OS you run it on — it
cannot cross-compile, so **build the `.exe` on Windows itself** (there is
no way to produce a genuine Windows binary from Linux or macOS):

```
build_exe.bat
```

This creates a virtual environment, installs `requirements-build.txt`
(runtime deps + PyInstaller), and runs `AurumTerminal.spec`. The result is
a single windowed executable at `dist\AurumTerminal.exe` — no console
window, no Python install required on the machine that runs it. On first
launch it creates a `data\` folder next to the `.exe` for the SQLite
database, screenshots, backups and exports, so keep the `.exe` in its own
folder.

On macOS/Linux, `./build_exe.sh` does the same thing and produces a native
binary for that OS (useful for testing the packaging, not for a Windows
target).

### Opening in VS Code

The project also runs fine from any editor: activate your virtual
environment and run `python main.py`, or use VS Code's Python extension
with `main.py` as the entry point.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New trade |
| `Ctrl+D` | Dashboard |
| `Ctrl+L` | Trade log |
| `Ctrl+R` | Risk manager |
| `Ctrl+S` | Statistics |
| `Ctrl+Q` | Quit |

## Testing

A headless smoke test seeds sample trades, renders every page, and
exercises security/backup/export services end-to-end:

```bash
xvfb-run -a python tests/smoke_test.py    # headless (CI / server)
python tests/smoke_test.py                # any machine with a display
```

## Project layout

```
app/
  config.py            paths & runtime constants
  database/
    schema.sql          normalized, indexed SQLite schema
    db.py                connection management & seed data
    repository.py        typed CRUD layer for every entity
  services/
    analytics.py          KPI / statistics engine
    risk.py                position sizing & risk engine
    ai_analysis.py          rule-based insight engine
    achievements.py          badge evaluation
    export.py                 CSV / Excel / PDF export
    backup.py                  backup / restore / health check
    security.py                 PIN/password hashing + Fernet encryption
    notifications.py             reminders & warnings
  ui/
    theme.py            black & gold design tokens
    app_window.py         sidebar navigation & page router
    login_window.py         PIN/password lock screen
    widgets/               stat cards, gauges, charts, calendar heatmap
    pages/                  one module per feature area
main.py                 entry point
tests/smoke_test.py      end-to-end smoke test
```
