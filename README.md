# 24K Pure Gold Business Manager

A .NET MAUI Blazor Hybrid app for shops that trade **only in 24K pure gold** —
sales, purchases, stock, cash ledger, bank ledger, customer ledger, supplier
ledger, expenses, and reports. There is no karat selector anywhere in this
app: every gram of gold tracked is assumed to be 24K.

This document covers **Phase 1** of the build: the solution structure, the
NuGet packages, the SQLite database models, and how to open and run the
project in Visual Studio. Screen-by-screen feature phases (Sales, Purchases,
Stock, Ledgers, Reports, Settings, PDF/WhatsApp) are listed in the
[roadmap](#roadmap) at the bottom and are added incrementally on top of this
foundation.

## Why 24K-only matters here

There is intentionally:
- No karat dropdown or karat field on any entity.
- No purity/conversion logic (22K → 24K, etc.).
- Only one gold rate per transaction: the 24K rate per gram.

Weight is the only thing the user chooses a unit for (gram / tola / masha /
ratti), and it is converted to grams immediately — grams is the only unit
ever stored or calculated against.

## Calculation formulas

**Sales:**
```
Gold Amount  = Weight (grams) × 24K Gold Rate
Final Total  = Gold Amount + Making Charges - Discount
Balance      = Final Total - Received Amount
```

**Purchases:**
```
Purchase Amount = Weight (grams) × 24K Gold Rate
Balance          = Purchase Amount - Paid Amount
```

Both formulas live in one place — `GoldCalculator` in the Core project — so
every screen (and the reports built later) uses the exact same math.

## Project structure

```
GoldBusinessManager.sln
src/
  GoldBusinessManager.Core/         Class library — no UI, no database engine.
    Enums/                          ItemType, WeightUnit, PaymentMethod, etc.
    Entities/                      The 12 SQLite tables (POCOs with sqlite-net attributes).
    Utilities/                      WeightConverter, GoldCalculator (the two formulas above).
    Interfaces/                     IRepository<T> contract.

  GoldBusinessManager.Data/         Class library — SQLite implementation.
    DatabaseService.cs              Opens the DB, creates tables, seeds defaults.
    Repository.cs                   Generic async CRUD used by every entity.

  GoldBusinessManager.App/          .NET MAUI Blazor Hybrid head project (Android/iOS/Mac Catalyst).
    MauiProgram.cs                  Dependency injection wiring.
    App.xaml / MainPage.xaml        MAUI shell hosting the BlazorWebView.
    Services/AuthState.cs           Tracks the signed-in user for the session.
    Components/
      Routes.razor                  Blazor router.
      Layout/                       MainLayout + bottom NavMenu.
      Pages/Login.razor             PIN pad sign-in screen.
      Pages/Dashboard.razor         Dashboard cards wired to live repository data.
    wwwroot/                        index.html + app.css (light/dark theme via CSS variables).
    Platforms/Android|iOS|MacCatalyst
    Resources/Styles|AppIcon|Splash|Fonts
```

### Why this split?

- **Core** has zero dependencies on MAUI or SQLite's runtime — it's just the
  shape of the data and the business math, so it's easy to unit test.
- **Data** is the only project that talks to the database file.
- **App** is the only project that knows it's a mobile app. Razor components
  inject `IRepository<T>` and small services (like `AuthState`) instead of
  classic XAML ViewModels — this is the natural MVVM-equivalent pattern in
  Blazor Hybrid: the component's `@code` block is the "ViewModel", services
  hold shared/business state.

## NuGet packages

| Project | Package | Version | Used for |
|---|---|---|---|
| Core | `sqlite-net-pcl` | 1.9.172 | `[Table]`/`[PrimaryKey]` attributes on entities |
| Data | `sqlite-net-pcl` | 1.9.172 | Async SQLite connection/queries |
| Data | `SQLitePCLRaw.bundle_green` | 2.1.10 | Native SQLite engine for every platform |
| App | `Microsoft.Maui.Controls` | (implicit) | Pulled in automatically by `UseMaui=true` + the MAUI workload — no explicit `PackageReference` needed |
| App | `Microsoft.AspNetCore.Components.WebView.Maui` | 8.0.100 | Hosts Blazor inside the MAUI app |
| App | `Microsoft.Extensions.Logging.Debug` | 8.0.1 | Debug-console logging |
| App | `CommunityToolkit.Maui` | 9.1.0 | Alerts, file picker, share sheet (used by the WhatsApp/PDF share feature) |

Planned for later phases (not referenced yet, so the app builds clean today):

| Package | Phase it lands in |
|---|---|
| `QuestPDF` | PDF invoice generation |
| `CommunityToolkit.Mvvm` | Only if a screen turns out to need `[ObservableProperty]`-style state outside Blazor's own state model |
| `CsvHelper` | CSV import/export in Settings and Reports |

## Database tables (SQLite, offline-first)

All 12 tables requested, one class per table in `GoldBusinessManager.Core/Entities`:

| Table | Purpose |
|---|---|
| `Users` | Admin/Staff accounts, PIN hash (SHA-256, never the raw PIN), permission flags |
| `Customers` | Name, mobile, opening balance |
| `Suppliers` | Name, mobile, opening balance |
| `SalesInvoices` | Full sale record — weight always stored in grams alongside the original unit/value entered |
| `Purchases` | Full purchase record — same weight-in-grams rule |
| `GoldStock` | One row per item type (bar, coin, biscuit, ring, chain, bangle, necklace, earrings, custom), current on-hand grams |
| `GoldStockMovements` | Signed audit trail of every stock change (sale, purchase, manual add/remove, adjustment) |
| `CashTransactions` | Signed cash ledger entries with a running balance |
| `BankAccounts` | Multiple accounts, opening + current balance |
| `BankTransactions` | Signed bank ledger entries per account, with a running balance and transfer linkage |
| `Expenses` | Rent/Salary/Electricity/Transport/Food/Other |
| `Settings` | Single-row shop configuration (name, address, phone, logo, default unit/rate, dark mode) |

All weight fields follow the same pattern: `WeightInput` + `WeightUnit` (what
the user typed) plus `WeightInGrams` (what everything else reads). Conversion
constants (`WeightConverter.cs`):

```
1 Tola  = 11.6638 grams
1 Masha = 1 Tola / 12
1 Ratti = 1 Tola / 96
```

## Visual Studio setup — step by step

1. **Install Visual Studio 2022** (17.8 or later), Community edition is fine.
2. In the Visual Studio Installer, edit your installation and check the
   **".NET Multi-platform App UI development"** workload. This pulls in the
   Android SDK/emulator tooling and the .NET 8 MAUI workload.
   - On Windows, iOS builds require a networked Mac (paired via Visual
     Studio's "Pair to Mac") or Visual Studio for Mac; Android builds work
     entirely on Windows.
3. Clone this repository and open `GoldBusinessManager.sln` in Visual Studio.
4. Let NuGet restore automatically (or right-click the solution →
   **Restore NuGet Packages**).
5. Set **GoldBusinessManager.App** as the startup project (right-click it →
   **Set as Startup Project**).
6. Pick a target in the toolbar debug-target dropdown:
   - **Android Emulator** — Visual Studio ships a default emulator image; if
     none exists, open **Tools → Android → Android Device Manager** and
     create one (e.g. Pixel 5, API 34).
   - **iOS Simulator** — only available with a paired Mac.
7. Press **F5** (or Ctrl+F5) to build and run.
8. First launch seeds a default admin PIN: **1234**. Change it once the
   Users/Settings screens land (Phase 2+) — it's stored as a SHA-256 hash,
   never in plain text.

The SQLite database file (`goldbusiness.db3`) is created automatically on
first run inside the app's private data folder
(`FileSystem.AppDataDirectory`) — nothing to configure.

## Roadmap

This phase delivers the foundation (models, database, DI wiring, login,
dashboard). Planned follow-up phases, each buildable on top of this without
changing what's here:

1. Sales invoice screen (create/edit/delete, stock deduction, cash/bank
   ledger posting, customer balance posting, search).
2. Purchase screen (mirror of Sales for buying gold in).
3. Stock screens (manual add/remove/adjustment, movement history, low-stock
   alerts, stock-by-item-type report).
4. Cash ledger, Bank ledger (multi-account + transfers), Customer ledger,
   Supplier ledger screens with full statements.
5. Expenses screen and its effect on profit/loss.
6. Reports (daily/monthly sales & purchases, ledger reports, profit/loss,
   CSV/PDF export) — this is also where "Today profit/loss" and "Monthly
   profit/loss" on the dashboard get wired up, once a costing method
   (average cost vs. FIFO) is chosen for cost-of-goods-sold.
7. Settings screen (shop profile, logo, default rate/unit, backup/restore,
   CSV import/export, dark-mode toggle wired to the CSS `data-theme`
   attribute already in `app.css`).
8. PDF invoice generation (QuestPDF) and WhatsApp share (via
   `CommunityToolkit.Maui`'s share sheet).
