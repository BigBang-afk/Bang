# FX Volume Trader

A professional Windows desktop application (WPF / .NET 8 / MVVM) that analyzes live price
candles, tick volume, candle pressure, market structure, and momentum to generate CALL/PUT
**signal assistance** - never guaranteed profit, never automated Quotex trading.

> **Risk warning**: FX Volume Trader is a signal-assistance and analysis tool. Signals,
> confidence scores, and backtest results are estimates based on historical and live market
> data - they are **not** guarantees of accuracy or profit. Trading binary/digital options
> carries a high risk of loss.

> **Important restrictions honored throughout this codebase**: no reverse-engineering of
> Quotex's private APIs, no extraction of cookies/session tokens/SSID/auth tokens, no
> CAPTCHA/Cloudflare/anti-bot bypassing, no Selenium/browser/JS injection or packet
> interception, no unofficial account control. Quotex is supported only via a manual
> signal-assistant workflow with an explicit user confirmation button. Automatic trade
> execution is only ever wired to brokers that expose an official, authorized trading API.

This repository currently contains **Phase 1** of the build plan described below.

---

## 1. Final solution architecture

```
FXVolumeTrader/
├── FXVolumeTrader.sln
├── FXVolumeTrader.App                 WPF UI shell (MVVM, DI composition root)
│   ├── Views                          MainWindow, DashboardView, PlaceholderView
│   ├── ViewModels                     MainWindowViewModel, DashboardViewModel,
│   │                                  NavigationService, NavItem, placeholder VMs
│   ├── Controls                       (reserved for custom controls - Phase 2+)
│   ├── Converters                     BooleanToVisibility, InverseBoolean, SignalTypeToBrush
│   ├── Themes                         Colors.xaml, DarkTheme.xaml
│   └── Resources                      Styles.xaml, ViewTemplates.xaml (VM→View mapping)
├── FXVolumeTrader.Core                 Pure domain layer, zero external dependencies
│   ├── Models                         Tick, Candle, TradeRequest, TradeExecutionResult
│   ├── Enums                          TradeDirection, SignalType, TradingMode, ...
│   ├── Interfaces                     IMarketDataProvider, ITradeExecutionProvider,
│   │                                  INavigationService, IRepository<T>
│   ├── Strategies                     (Phase 3: Volume Pressure Strategy)
│   ├── Indicators                     (Phase 3: EMA/RSI/ATR/ADX/Bollinger)
│   └── Risk                           (Phase 4: risk-management engine)
├── FXVolumeTrader.Infrastructure       EF Core + SQLite, logging, security, providers
│   ├── Data                           ApplicationDbContext, SeedData, Migrations,
│   │                                  DesignTimeDbContextFactory
│   │   ├── Entities                   12 EF Core entities (see ERD below)
│   │   └── Configurations             IEntityTypeConfiguration<T> per entity
│   ├── Repositories                   Repository<T> (generic, IRepository<T>)
│   ├── MarketData                     (Phase 2: Mock/CsvReplay/OfficialApi providers)
│   ├── Execution                      (Phase 4: Paper/Manual/OfficialApi execution)
│   ├── Logging                        SerilogConfigurator
│   └── Security                       SensitiveDataMasker
├── FXVolumeTrader.Backtesting          (Phase 5: non-repainting backtesting engine)
├── FXVolumeTrader.Tests                xUnit + Moq + EF Core InMemory
└── README.md
```

**Dependency direction**: `App` → `Infrastructure` → `Core`, and `App` → `Core`. `Core` has
no NuGet dependencies at all, so the domain model, enums, and interfaces stay fully portable
and unit-testable. `Backtesting` depends only on `Core`.

---

## 2. NuGet packages

| Project | Package | Why |
|---|---|---|
| Infrastructure | `Microsoft.EntityFrameworkCore.Sqlite` 8.0.10 | SQLite provider |
| Infrastructure | `Microsoft.EntityFrameworkCore.Design` 8.0.10 | Migrations tooling |
| Infrastructure | `Microsoft.EntityFrameworkCore.Tools` 8.0.10 | PMC `Add-Migration`/`Update-Database` |
| Infrastructure | `Microsoft.Extensions.Configuration.Abstractions` 8.0.0 | IConfiguration in services |
| Infrastructure | `Microsoft.Extensions.DependencyInjection.Abstractions` 8.0.2 | DI-friendly services |
| Infrastructure | `Microsoft.Extensions.Options` 8.0.2 | Options pattern |
| Infrastructure / App | `Serilog`, `Serilog.Extensions.Hosting`, `Serilog.Settings.Configuration`, `Serilog.Sinks.Console`, `Serilog.Sinks.File` | Structured logging to console + rolling file |
| App | `CommunityToolkit.Mvvm` 8.3.2 | `[ObservableProperty]` / `[RelayCommand]` source generators |
| App | `LiveChartsCore.SkiaSharpView.WPF` 2.0.0-rc4.5 | Candlestick + column (volume) charts |
| App | `Microsoft.Extensions.Hosting` 8.0.1 | Generic host, DI container |
| App | `Microsoft.Extensions.Configuration.Json` / `.Binder` | appsettings.json binding |
| Tests | `Microsoft.NET.Test.Sdk`, `xunit`, `xunit.runner.visualstudio`, `Moq`, `coverlet.collector`, `Microsoft.EntityFrameworkCore.InMemory` | Unit/integration testing |

All package versions are pinned in each `.csproj`; Visual Studio will restore them
automatically on first build (see §8).

---

## 3. Database entity relationship overview

```
AppSetting (standalone key/value store)

StrategyConfiguration 1───* Backtest 1───* BacktestTrade

TradingSession 1───* TickRecord
TradingSession 1───* TradeRecord
TradingSession 1───* RiskEvent

Candle 1───* Signal 1───* SignalScoreComponent
Signal 1───* TradeRecord   (a trade may reference the signal that produced it)

ApplicationLog (standalone, optional DB mirror of Serilog output)
```

- **AppSetting**: generic key/value settings (risk limits, notification toggles, theme, ...).
- **TickRecord / Candle**: persisted market data (in-memory `Core.Models.Tick`/`Candle` are
  what live analysis actually runs against - see Phase 2/3).
- **Signal / SignalScoreComponent**: every CALL/PUT/NO TRADE signal with its full, auditable
  0-100 confidence breakdown (never a bare "probability").
- **TradeRecord**: the trading-journal backbone - manual, paper, or official-API trades.
- **TradingSession**: one Start→Stop Analysis run; aggregates ticks/trades/risk events.
- **StrategyConfiguration**: named, versioned, editable strategy parameters (seeded with a
  conservative default - see `SeedData.cs`).
- **Backtest / BacktestTrade**: one backtest run and its simulated trades/results.
- **RiskEvent**: audit trail of every time the risk engine blocked a trade or forced a stop.
- **ApplicationLog**: optional DB mirror of structured logs for the in-app log viewer (Phase 6).

---

## 4. Application navigation map

```
MainWindow
 └─ Sidebar (14 items) → ContentControl bound to INavigationService.CurrentViewModel
     ├─ Dashboard                 ✅ fully built in Phase 1 (shell + live chart placeholders)
     ├─ Live Chart                🚧 placeholder (Phase 2)
     ├─ Signal History            🚧 placeholder (Phase 3)
     ├─ Paper Trading             🚧 placeholder (Phase 4)
     ├─ Quotex Assistant          🚧 placeholder (Phase 4) - manual confirmation only
     ├─ Backtesting               🚧 placeholder (Phase 5)
     ├─ Trading Journal           🚧 placeholder (Phase 6)
     ├─ Performance Analytics     🚧 placeholder (Phase 6)
     ├─ Strategy Settings         🚧 placeholder (Phase 6)
     ├─ Risk Settings             🚧 placeholder (Phase 4/6)
     ├─ Data Provider Settings    🚧 placeholder (Phase 2)
     ├─ Application Logs          🚧 placeholder (Phase 6) - logs already write to disk
     ├─ Backup & Restore          🚧 placeholder (Phase 6)
     └─ About & Risk Warning      🚧 placeholder - shows the full risk disclaimer today
```

Navigation is view-model-first: `NavigationService.NavigateTo<TViewModel>()` resolves the
view model from DI and raises `CurrentViewModelChanged`; `MainWindow`'s `ContentControl` picks
the matching `View` via an implicit `DataTemplate` in `Resources/ViewTemplates.xaml`. All 13
not-yet-implemented pages share one `PlaceholderView`/`PlaceholderViewModelBase` pair, so wiring
in each real page later is additive, not a rewrite.

---

## 5. Development checklist

- [x] Solution + 5 projects created with correct target frameworks and references
- [x] NuGet packages installed
- [x] Folder structure matches the spec exactly
- [x] Core enums and models (Tick, Candle w/ full volume-analysis math, TradeRequest/Result)
- [x] `IMarketDataProvider`, `ITradeExecutionProvider` interfaces (verbatim from spec)
- [x] SQLite database + EF Core, 12 entities, fluent configuration, seeded defaults
- [x] Initial EF Core migration generated and verified (creates all 12 tables + seed rows)
- [x] Generic repository (`IRepository<T>` / `Repository<T>`) + DI registration
- [x] Serilog console + rolling file logging, global exception handling
- [x] Dark theme (bullish=green, bearish=red, warning=yellow, neutral=gray)
- [x] Navigation system (14 pages, view-model-first, DataTemplate-based)
- [x] Main dashboard shell: candlestick chart, tick-volume bars, asset/price/timeframe/expiry,
      feed status, trend, market condition, CALL/PUT confidence, signal + explanation,
      suggested amount, daily P/L, win rate, consecutive W/L, trades today, daily loss limit,
      Start/Stop Analysis, Confirm CALL/PUT, Reject Signal, Emergency Stop
- [x] xUnit test project with real, passing tests (candle math, tick validation, DbContext
      seeding, repository CRUD) - 12/12 passing
- [ ] Phase 2: Mock/CsvReplay market data providers, tick simulator, candle builder, live charts
- [ ] Phase 3: Volume/indicator/market-structure/confidence-score engines, signal generation
- [ ] Phase 4: Paper trading, Quotex manual assistant, expiry timer, risk-management engine
- [ ] Phase 5: Backtesting engine, CSV import, performance reports, walk-forward testing
- [ ] Phase 6: Trading journal, analytics, settings screens, backup/restore, full test coverage

---

## 6. What was verified in this environment

This container has no Visual Studio and no Windows, but it does have network access, so the
.NET 8 SDK was installed locally to validate the code (not just hand-check it):

- `FXVolumeTrader.Core`, `FXVolumeTrader.Infrastructure`, `FXVolumeTrader.Backtesting`, and
  `FXVolumeTrader.Tests` build with **0 warnings, 0 errors**.
- `FXVolumeTrader.App` (the WPF project) builds with **0 errors** using
  `-p:EnableWindowsTargeting=true` (a Linux-only flag to load the Windows reference assemblies;
  **not needed on Windows/Visual Studio**, where it is the default). The only warnings are
  benign `NU1701` notices from LiveCharts2's WPF package pulling in a couple of transitive
  .NET Framework-targeted dependencies (OpenTK, SkiaSharp.Views.WPF) - a known, harmless
  characteristic of the current LiveCharts2 WPF release.
- All 12 xUnit tests pass.
- `dotnet ef migrations add InitialCreate` was run against `ApplicationDbContext` and the
  generated migration was applied to a real SQLite file: all 12 tables were created and the
  seed data (16 `AppSettings` rows, 1 `StrategyConfiguration` row) landed correctly. The
  generated migration is committed under
  `FXVolumeTrader.Infrastructure/Data/Migrations/`, so you do **not** need to run
  `Add-Migration` again unless you change the entity model.

What was **not** verified here (requires actual Windows + Visual Studio): rendering/visual
layout of the XAML, LiveCharts2 chart interaction, and running the compiled `.exe`.

---

## 7. Visual Studio 2022 setup instructions

### 7.1 Prerequisites

1. **Visual Studio 2022** (17.8+) with the **.NET desktop development** workload installed
   (this brings the WPF designer and the Windows Desktop runtime/SDK).
2. **.NET 8 SDK** (Visual Studio 2022 17.8+ installs this automatically with the workload
   above; verify with `dotnet --version` in a Developer Command Prompt).

### 7.2 Open the solution

1. Clone/pull this branch.
2. Double-click `FXVolumeTrader.sln`, or in Visual Studio: **File → Open → Project/Solution**
   and select it. All 5 projects (`App`, `Core`, `Infrastructure`, `Backtesting`, `Tests`) load
   automatically - they're already wired into the `.sln` with correct project references.

### 7.3 Restore NuGet packages

Visual Studio restores automatically on load. If it doesn't (or you see red squiggles on
`using` statements), right-click the **Solution** in Solution Explorer → **Restore NuGet
Packages**, or run from the Package Manager Console:

```powershell
dotnet restore FXVolumeTrader.sln
```

### 7.4 Create/update the SQLite database

The initial migration is already committed (`FXVolumeTrader.Infrastructure/Data/Migrations/`),
so you just need to apply it. Two options:

**Option A - it happens automatically.** `App.xaml.cs` calls `db.Database.Migrate()` on
startup, which creates `App_Data/fxvolumetrader.db` next to the built exe and applies any
pending migrations the first time you run the app (F5).

**Option B - apply it manually first**, via the Package Manager Console
(**Tools → NuGet Package Manager → Package Manager Console**), with
**FXVolumeTrader.Infrastructure** set as the "Default project" dropdown:

```powershell
Update-Database -Project FXVolumeTrader.Infrastructure -StartupProject FXVolumeTrader.App
```

or from a regular terminal:

```powershell
dotnet ef database update --project FXVolumeTrader.Infrastructure --startup-project FXVolumeTrader.App
```

### 7.5 If you ever need to add a new migration

After changing any entity in `FXVolumeTrader.Infrastructure/Data/Entities` or its
`IEntityTypeConfiguration`:

```powershell
Add-Migration <DescriptiveName> -Project FXVolumeTrader.Infrastructure -StartupProject FXVolumeTrader.App
Update-Database -Project FXVolumeTrader.Infrastructure -StartupProject FXVolumeTrader.App
```

### 7.6 Compile the solution

**Build → Build Solution** (Ctrl+Shift+B), or:

```powershell
dotnet build FXVolumeTrader.sln -c Debug
```

### 7.7 Run the application

Set **FXVolumeTrader.App** as the startup project (right-click it in Solution Explorer →
**Set as Startup Project**), then press **F5**. The dashboard opens with a dark theme, a
14-item sidebar, and a placeholder candlestick/volume chart with sample data - nothing is
connected to a live feed yet (that's Phase 2).

### 7.8 Common build errors and fixes

| Symptom | Fix |
|---|---|
| `NETSDK1100: To build a project targeting Windows...` | You're building outside Windows/Visual Studio (e.g. plain `dotnet build` on Linux/macOS). On Windows with the desktop workload installed this never happens; if you must build the App project on non-Windows tooling, pass `-p:EnableWindowsTargeting=true`. |
| WPF designer/XAML IntelliSense errors before first build | Build the solution once (Ctrl+Shift+B) so the CommunityToolkit.Mvvm and LiveCharts2 source generators/assemblies are restored, then reload the XAML designer. |
| `SqliteException: unable to open database file` | Make sure the process has write access to its output folder, or delete the `App_Data` folder and let `Database.Migrate()` recreate it. |
| `Add-Migration`/`Update-Database` can't find `ApplicationDbContext` | Confirm the Package Manager Console's "Default project" dropdown is `FXVolumeTrader.Infrastructure` and `-StartupProject FXVolumeTrader.App` is passed (or set App as the startup project first). |
| NU1701 warnings about OpenTK/SkiaSharp.Views.WPF | Expected/benign (see §6) - a transitive dependency of LiveCharts2's WPF package; does not affect functionality. |
| Missing `.NET desktop development` workload | Open **Visual Studio Installer → Modify** and enable it; this installs the WPF/Windows Desktop targeting packs required by `net8.0-windows`. |

### 7.9 Test the application

Run the automated tests from **Test → Run All Tests** (Test Explorer), or:

```powershell
dotnet test FXVolumeTrader.Tests/FXVolumeTrader.Tests.csproj
```

You should see 12/12 passing (Candle volume-analysis math, Tick validation, DbContext seed
data, and Repository CRUD).

For manual UI testing of this phase: launch the app, confirm the dark theme renders, click
through all 14 sidebar items (Dashboard shows the full shell; the other 13 show their
"not implemented yet" placeholder with a phase note), and on the Dashboard verify Start
Analysis / Stop Analysis toggle correctly and Emergency Stop disables everything (Confirm
CALL/PUT/Reject stay disabled throughout Phase 1 since there is no signal engine yet - that's
expected and intentional, not a bug).

---

## 8. Next steps

Phase 2 (mock market data provider, tick simulator, candle builder, live chart wiring,
connection-status system) builds directly on top of this scaffold without changing any of the
Phase 1 public interfaces (`IMarketDataProvider`, `Candle`, `Tick`, `INavigationService`, etc.).
