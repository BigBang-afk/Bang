# OTC Precision Signal System

A non-repainting, multi-module confluence CALL/PUT signal system for MetaTrader 5,
built for short-duration (M1-M15) analysis. It ships as an indicator, a backtest/
validation EA, an optional (disabled-by-default) auto-trading EA, an authorized
custom-symbol feed importer, and a companion Python bridge.

## 1. System description

The core of the system is `SignalEngine.mqh`, a modular weighted-confluence engine
shared identically by the indicator and the tester EA. On every fully closed candle
it runs nine analysis modules - market structure, trend, momentum, volatility,
price action, support/resistance, liquidity, regime, and multi-timeframe
confirmation - and combines them into a 0-100 CALL score and a 0-100 PUT score. A
signal only becomes a **confirmed, final signal** when:

* Confidence (the winning score) exceeds the configured threshold.
* At least the configured number of the 8 signal-quality checks agree.
* No no-trade filter is currently blocking (volatility spike, compressed market,
  conflicting higher-timeframe trend, price trapped near S/R, wide spread, data
  gap, insufficient history, unstable regime, news window, etc).
* The minimum cooldown (in candles) since the last signal has elapsed.
* The candle that produced the signal has actually closed.

Because every one of these checks reads only bars that have already closed
(`shift >= 1` in series-array terms), the system cannot repaint, cannot use
future/incomplete candle data, and a confirmed arrow, once drawn, never moves.

## 2. Important risk warning

**This system does not guarantee any win rate, including 85%.** The default
confidence threshold of 85 is a *scoring filter* used to favor fewer, higher-quality
signals - it is not a promise, a target, or a displayed statistic. The only win
rate this system ever shows you is `CSignalStatistics`'s measured win rate from
**real, settled historical signals**, and it will display `INSUFFICIENT SAMPLE`
until at least `InpMinSampleSize` (default 200) signals have settled. Markets
change; historical performance - simulated or real - never guarantees future
results. The automatic-trading EA is disabled by default and should not be
enabled on a live account before independent validation (see section 9).

## 3. Difference between the indicator and an EA

* **OTCPrecisionIndicator.mq5** (Indicators folder) only analyzes and displays. It
  draws arrows, runs the dashboard, fires alerts/CSV logs, and tracks statistics.
  It never sends an order.
* **OTCSignalTesterEA.mq5** (Experts folder) is an Expert Advisor that also never
  sends an order. It exists purely to run the same `CSignalEngine` logic inside
  the MT5 Strategy Tester so you can backtest, walk-forward test, and optimize the
  signal parameters at full historical speed, with CSV export and a custom
  `OnTester()` validation score.
* **OTCTradeEA.mq5** (Experts folder) is the only file in this project capable of
  sending real orders, and only on conventional broker-supplied symbols via normal
  MT5 buy/sell market orders. It is **disabled by default** (`InpMasterEnable =
  false`) and additionally requires `InpDemoOnlyAcknowledged = true` before it will
  send a single order.

## 4. Why 85 is not a guaranteed win rate

85 is the **Conservative** mode's minimum-confidence *scoring threshold* inside
`SEngineSettings.min_confidence`. It only decides which candidate signals are
filtered out before they ever reach the chart or the statistics engine. It is
computed from technical confluence (structure, trend, momentum, price action,
S/R, liquidity, multi-timeframe agreement) - not from any historical win-rate
lookup, and the codebase does not contain any hardcoded, fabricated, or
display-side-adjusted performance figures. The actual, measured win rate is
whatever `CSignalStatistics` computes from real settled outcomes, and it is shown
as `INSUFFICIENT SAMPLE` until there is enough data to be statistically
meaningful.

## 5. Installation paths

Copy the folders into your MetaTrader 5 **Data Folder** (MetaTrader 5 -> File ->
Open Data Folder), preserving structure:

```
<Data Folder>\MQL5\Include\OTCPrecision\MarketRegime.mqh
<Data Folder>\MQL5\Include\OTCPrecision\SignalEngine.mqh
<Data Folder>\MQL5\Include\OTCPrecision\RiskManager.mqh
<Data Folder>\MQL5\Include\OTCPrecision\Statistics.mqh
<Data Folder>\MQL5\Include\OTCPrecision\Dashboard.mqh
<Data Folder>\MQL5\Indicators\OTCPrecisionIndicator.mq5
<Data Folder>\MQL5\Experts\OTCSignalTesterEA.mq5
<Data Folder>\MQL5\Experts\OTCTradeEA.mq5
<Data Folder>\MQL5\Scripts\OTCFeedImporter.mq5
<Data Folder>\MQL5\Presets\OTC_Default.set
```

The Python bridge (`Python/authorized_feed_bridge.py`) runs outside MetaTrader, on
your own machine, and simply writes CSV files that `OTCFeedImporter.mq5` reads
from `MQL5\Files\`.

## 6. Compilation instructions

1. Open MetaEditor (from MetaTrader 5: Tools -> MetaEditor, or F4).
2. Make sure the `Include\OTCPrecision\` folder is in place first - the .mq5
   files depend on it via `#include <OTCPrecision/...>`.
3. Open `OTCPrecisionIndicator.mq5`, `OTCSignalTesterEA.mq5`, `OTCTradeEA.mq5`,
   and `OTCFeedImporter.mq5` one at a time and press **Compile** (F7). Each should
   compile with 0 errors and 0 warnings.
4. Compiled `.ex5` files appear next to their `.mq5` source automatically.

## 7. How to attach the indicator

1. Open a chart on a supported timeframe: **M1, M2, M3, M5, or M15**.
2. In the Navigator panel, expand Indicators -> Custom, drag
   **OTCPrecisionIndicator** onto the chart.
3. On the Inputs tab, click **Load** and select `Presets\OTC_Default.set` for the
   Conservative preset, or configure inputs manually.
4. Confirm "Allow Alerts"/"Allow DLL imports" is not required (this project uses
   no DLLs); enable "Allow WebRequest" only if you separately configure push/email
   alerts through MT5 itself.
5. The dashboard appears in the upper-right corner; confirmed CALL/PUT arrows
   appear only on fully closed candles.

## 8. How to run the tester EA

1. Open **Strategy Tester** (Ctrl+R).
2. Expert: `OTCSignalTesterEA`. Symbol/timeframe: any supported combination.
3. Model: "Every tick" gives the most accurate bar-close timing; "Open prices
   only" is faster and still non-repainting since the engine only ever reads
   closed bars.
4. Load `OTC_Default.set` on the Inputs tab (or configure manually), set your
   date range, and click **Start**.
5. Enable **Visual mode** to see the live dashboard while testing.
6. After the run, check the Journal/Experts tab for the summary line, and look for
   `OTCSignalTester_Signals.csv` and `OTCSignalTester_Summary.txt` in
   `MQL5\Files\`.

## 9. How to perform forward testing

1. Set `InpTrainingStart` / `InpTrainingEnd` to your in-sample window and
   `InpForwardStart` / `InpForwardEnd` to a later, untouched window (recommended:
   at least 30% of your total data, never seen during parameter selection).
2. Run the full period once in the tester. The EA automatically buckets settled
   signals into the in-sample vs. forward-test `CSignalStatistics` instances based
   on each signal's own timestamp - it does not need two separate runs.
3. Compare `g_stats_insample` vs `g_stats_forward` results (both are included in
   the `OnTester` Journal line and can be extended to their own summary export if
   you need it). A parameter set whose forward results collapse relative to
   training is not validated - the built-in `OnTester()` score already penalizes
   this gap.
4. For true walk-forward optimization (rolling training/forward windows), run the
   optimizer multiple times over shifted date ranges and compare the resulting
   custom scores; MT5 does not provide a fully automatic WFO harness, and this
   project does not fabricate one - inspect the optimization results table
   directly to judge parameter stability (are neighboring parameter values close
   in score, or wildly different?).
5. Do not declare success merely because an in-sample result exceeds 85%. Always
   check the separately reported out-of-sample/forward figures, the sample size,
   drawdown, and consecutive-loss statistics before drawing any conclusion.

## 10. How to use custom symbols legally

`OTCFeedImporter.mq5` only ever reads a local CSV file that **you** populate from
a source **you** are authorized to use. It contains no login, cookie, token,
scraping, or browser-automation code, and never will.

1. Obtain your data legally (an authorized provider's documented export/API, or
   your own recorded broker data).
2. Either produce the CSV yourself in the documented format (see the header
   comment in `OTCFeedImporter.mq5`), or run `authorized_feed_bridge.py` against
   your provider's documented API to generate it automatically.
3. Place the CSV under `MQL5\Files\OTCFeed\` (or point `InpFeedFilePath` at it).
4. Run the `OTCFeedImporter` script from the Navigator's Scripts list, dragging it
   onto any chart. It creates a custom symbol such as `OTC.AUTH.EURUSD` (trading
   is intentionally left disabled on custom symbols - they exist for analysis).
5. Open a chart on the new custom symbol (Market Watch -> right-click -> Symbols,
   or "Show All", then drag the symbol to a new chart) and attach
   `OTCPrecisionIndicator` as usual.

## 11. How to configure alerts

Under the indicator's **Alerts** input section:

* `InpAlertPopup` - MT5 popup alert.
* `InpAlertSound` / `InpAlertSoundFile` - sound alert (file must exist in
  `MQL5\Sounds\`).
* `InpAlertPush` - push notification (requires MetaQuotes ID configured in
  Tools -> Options -> Notifications).
* `InpAlertEmail` - email (requires SMTP configured in Tools -> Options -> Email).
* `InpAlertCSVLog` - appends every settled signal to a CSV file in `MQL5\Files\`.

Each confirmed signal alerts exactly once. A terminal restart will not re-alert
already-alerted historical bars - the last-alerted bar time is persisted via a
`GlobalVariable` keyed by symbol and timeframe.

## 12. How to read statistics

The dashboard's statistics block shows, from real settled signals only:

* **Settled / W / L / D** - total settled signals, wins, losses, draws.
* **Win rate** - wins ÷ (wins + losses), excluding draws; shows
  `INSUFFICIENT SAMPLE (x/y)` until `InpMinSampleSize` signals have settled.
* **Consec wins / Consec losses / Max consec losses** - current and worst streaks.
* **Today's signals / Session win rate** - resets at each new UTC/server day.

`CSignalStatistics` additionally tracks (available via `ExportSummaryReport()` and
the per-field accessors) win rate broken down by symbol, timeframe, expiry,
regime, and hour-of-day, plus a simulated profit factor, expected value per
signal, and max simulated drawdown at a configurable payout percentage. These
simulations are clearly labeled as simulations - they do not represent real money
and are not a forecast.

## 13. How to export CSV reports

* **Indicator**: set `InpAlertCSVLog = true`. A file named
  `OTCPrecision_<symbol>_<timeframe>_signals.csv` is created/appended under
  `MQL5\Files\`.
* **Tester EA**: set `InpExportCSV = true`, configure `InpCSVFileName` (per-signal
  export) and `InpSummaryReportFileName` (full breakdown report, written on
  `OnDeinit`). Both appear in `MQL5\Files\` after the test run.

## 14. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Compile error "cannot open include file" | The `Include\OTCPrecision\` folder is missing or misplaced - it must sit directly under `MQL5\Include\`. |
| No arrows ever appear | Check the dashboard's "Blocking" line - a no-trade filter is likely active. Conservative mode is intentionally strict. |
| Dashboard shows "INSUFFICIENT SAMPLE" | Expected until `InpMinSampleSize` signals have settled - lower it for faster (less statistically reliable) feedback while testing. |
| Alerts fire twice after recompiling the indicator | Should not happen - if it does, delete the `OTCP_LASTALERT_*` global variable (MT5 -> Tools -> Global Variables) and confirm you're not running two instances on the same chart. |
| Custom symbol shows no data / "STALE FEED WARNING" | Re-run `OTCFeedImporter`, verify the CSV file's timestamps are recent and strictly ascending UTC, and that `authorized_feed_bridge.py` (if used) is still running and connected. |
| Tester EA produces zero signals | Check `InpMinHistoryBars` isn't larger than your tested date range, and that your symbol/timeframe combination has the higher timeframes (confirm/trend TF) available in history. |
| `OTCTradeEA` never trades | By design until `InpMasterEnable = true` **and** `InpDemoOnlyAcknowledged = true` are both set, and a confirmed signal occurs with `CRiskManager.CanOpenNewTrade()` returning true. |

## 15. Recommended demo-testing workflow

1. Backtest with `OTCSignalTesterEA` across at least 12 months of data, multiple
   symbols, and multiple market regimes (trending, ranging, high/low volatility).
2. Require at least 1,000 settled signals across the full portfolio before
   drawing conclusions; reserve at least 30% of the data as untouched
   out-of-sample/forward data.
3. Reject any parameter set whose forward results collapse relative to training,
   whose max drawdown or max consecutive losses exceed your configured limits, or
   whose behavior varies wildly between neighboring optimizer parameter sets.
4. Run the indicator live on a **demo account** for an extended period, watching
   real-time confirmed signals accumulate in the statistics panel.
5. Only after all of the above should `OTCTradeEA` be considered on a demo
   account, and only with `InpMasterEnable` and `InpDemoOnlyAcknowledged` both
   explicitly set. Do not move to a live account until you are satisfied with a
   statistically meaningful sample of demo/forward results.

## 16. Explanation of every input

Inputs are grouped identically across the indicator and both EAs wherever the
same concept applies:

* **General** - `InpMinHistoryBars` (minimum bars before the engine will
  evaluate), `InpDebugLogging` (verbose Journal logging).
* **Signal Mode** - `InpSignalMode`: Conservative / Balanced / Aggressive /
  Custom. Non-Custom modes override the Confidence Scoring section.
* **Expiry** - `InpExpiryMode` (1/2/3/5 candles, or custom seconds for
  statistics), `InpCustomExpirySeconds`.
* **Trend** - EMA fast/mid/slow periods and slope lookback.
* **Momentum** - RSI period, Stochastic %K/%D/slowing, MACD fast/slow/signal,
  ROC period.
* **Structure** - swing/fractal arm length and structure search window.
* **Support/Resistance** - swing lookback, ATR proximity multiplier, which level
  types to use (previous day, previous session, round numbers), round-level step.
* **Liquidity** - sweep lookback and ATR sweep margin.
* **Volatility** - ATR period, Bollinger period/deviation, minimum body/ATR
  ratio, max ATR spike ratio, volatility percentile lookback/thresholds, ADX
  period/threshold (regime).
* **Multi-Timeframe** - confirmation and trend timeframes (defaults M5/M15 on an
  M1 chart).
* **Confidence Scoring** - Custom-mode thresholds/requirements and the module
  weights used to blend CALL/PUT scores.
* **No-Trade Filters** - max spread, max data-gap multiplier, manual news
  windows.
* **Alerts** - popup/sound/push/email/CSV toggles.
* **Statistics** - minimum sample size before a win rate is shown, simulated
  payout percent used for profit-factor/EV/drawdown simulations.
* **Dashboard** - show/hide, position, font size.
* **Preview** - `InpShowPreview` (forming-candle preview; **off by default**).
* **Arrows** - ATR distance multiplier, NO TRADE marker toggle, confidence label
  toggle.
* **Authorized Feed** - stale-feed warning threshold (indicator); file
  path/format/validation options (importer script).
* **EA Risk Controls** (`OTCTradeEA` only) - lot mode, fixed lot, risk percent
  (default 0.25%), ATR SL multiplier, minimum reward:risk, TP reward:risk ratio,
  max spread, max trades/day, max daily loss %, max consecutive losses, emergency
  equity stop %, trading-hours filter, master enable switch, demo-only
  acknowledgement.
* **Validation** (`OTCSignalTesterEA` only) - training/forward date windows,
  minimum required trades/market days/symbols, maximum acceptable drawdown and
  consecutive losses.
* **OnTester Scoring Weights** (`OTCSignalTesterEA` only) - relative weighting of
  expected value, profit factor, sample size, forward stability, drawdown penalty
  and consecutive-loss penalty in the custom optimization score.
* **Debugging** - extra Journal logging.

## 17. Known limitations

* Market structure, S/R, and liquidity detection use pragmatic fractal/ATR-based
  heuristics rather than a full order-flow or tick-level reconstruction - they are
  a reasonable approximation, not a claim of perfect market micro-structure
  detection.
* "Previous session" support/resistance is approximated using the prior H4 block
  rather than a broker-specific session calendar.
* Parameter-stability validation (comparing neighboring optimizer results) must
  currently be reviewed manually in the Strategy Tester's optimization results
  table - MT5 does not provide a built-in automated walk-forward harness, and this
  project does not fabricate one.
* The multi-symbol scanning mode in `OTCSignalTesterEA` reads historical bar data
  for additional symbols but does not simulate cross-symbol tick-level execution;
  it is intended for signal-generation/statistics validation, not multi-symbol
  order simulation.
* The system is a signal/analysis tool. It does not itself execute binary-option
  trades of any kind on any platform, and `OTCTradeEA` only ever places
  conventional MT5 market orders on broker-supplied symbols.

---

## Python Bridge

`Python/authorized_feed_bridge.py` bridges a documented, authorized market-data
API into the CSV format `OTCFeedImporter.mq5` expects. It never hardcodes an
endpoint or credential - both come from environment variables you set:

```
OTC_FEED_API_URL        Required for --mode live. Your authorized provider's documented endpoint.
OTC_FEED_API_KEY        Optional credential, sent as a bearer token - never logged.
OTC_FEED_API_SECRET     Optional credential - never logged.
OTC_FEED_OUTPUT_DIR     Optional override for --output-dir.
```

### requirements.txt

```
# Python 3.11+
requests>=2.31
```

Install with `pip install -r requirements.txt` (or simply `pip install requests`
if you prefer not to create the file).

### Usage

```bash
# Development / pipeline testing with synthetic data - no live source needed
python authorized_feed_bridge.py --mode mock --symbol EURUSD

# Live mode against your own authorized, documented provider
export OTC_FEED_API_URL="https://your-authorized-provider/api/ticks"
export OTC_FEED_API_KEY="..."
python authorized_feed_bridge.py --mode live --symbol EURUSD
```

The exact insertion point for your provider's documented connection code is
clearly marked inside `AuthorizedFeedSource.fetch_batch()` with
`>>> AUTHORIZED PROVIDER CONNECTION CODE GOES HERE >>>` /
`<<< END AUTHORIZED PROVIDER CONNECTION CODE <<<` comments.

---

## Folder tree

```
OTCPrecisionSystem/
├── Indicators/
│   └── OTCPrecisionIndicator.mq5
├── Experts/
│   ├── OTCSignalTesterEA.mq5
│   └── OTCTradeEA.mq5
├── Scripts/
│   └── OTCFeedImporter.mq5
├── Include/OTCPrecision/
│   ├── SignalEngine.mqh
│   ├── MarketRegime.mqh
│   ├── RiskManager.mqh
│   ├── Statistics.mqh
│   └── Dashboard.mqh
├── Python/
│   └── authorized_feed_bridge.py
├── Presets/
│   └── OTC_Default.set
└── README.md
```

## Installation procedure (summary)

1. Copy `Include/OTCPrecision/*.mqh` to `<Data Folder>\MQL5\Include\OTCPrecision\`.
2. Copy `Indicators/OTCPrecisionIndicator.mq5` to `<Data Folder>\MQL5\Indicators\`.
3. Copy `Experts/*.mq5` to `<Data Folder>\MQL5\Experts\`.
4. Copy `Scripts/OTCFeedImporter.mq5` to `<Data Folder>\MQL5\Scripts\`.
5. Copy `Presets/OTC_Default.set` to `<Data Folder>\MQL5\Presets\`.
6. Compile all four `.mq5` files in MetaEditor (F7 each).
7. (Optional) Set up `Python/authorized_feed_bridge.py` on your own machine per
   the Python Bridge section above, only if you intend to use an authorized
   custom-symbol feed.
8. Attach `OTCPrecisionIndicator` to a supported chart (M1/M2/M3/M5/M15), load
   `OTC_Default.set`, and observe the dashboard. Validate thoroughly (sections 8-9,
   15) before ever considering `OTCTradeEA` on a live account.
