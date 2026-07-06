# Trading Journal

A Windows desktop trading journal built with WPF (.NET 8) and SQLite.

## Features

- **Dashboard** – total profit/loss (USD), net PKR, net gold-equivalent, current rates, and recent entries (editable/deletable).
- **Add Profit / Add Loss** – enter an amount in USD (optionally tied to a customer); the app shows a live preview of the PKR and gold-equivalent result before saving.
- **Customer Ledger** – manage customers, add a profit/loss straight against the selected customer (Add Profit / Add Loss buttons on the ledger screen), edit or delete any entry inline, and see a running-balance statement (PKR) for the selected customer.
- **Statement preview & printing** – "Print Statement" on the Customer Ledger opens a paginated preview of that customer's statement with a built-in Print button.
- **Settings** – configure the USD → PKR rate and the gold rate (PKR per unit, e.g. per Tola/Gram), plus the unit label.

## Editing and deleting entries

Every entries grid (Dashboard's recent entries, and the Customer Ledger) has **Edit** and **Delete** buttons per row. Editing keeps the rates that were originally snapshotted on that entry — so fixing a typo in the amount doesn't silently re-price it against today's rates. Deleting asks for confirmation first.

## How the conversion works

Set in **Settings**:
- `USD to PKR Rate` – how many PKR one USD is worth.
- `Gold Rate` – the PKR price of one unit of gold (whatever unit you choose, e.g. one Tola).

When you add a profit or loss in USD:

```
PKR result  = USD amount × USD-to-PKR rate
Gold result = PKR result ÷ Gold rate
```

The PKR and gold-equivalent rates used are **snapshotted on the entry** at save time, so past entries keep their historical value even if you update the rates later. The Dashboard and Customer Ledger sum these snapshots.

## Project layout

```
TradingJournal.sln
src/
  TradingJournal.Core/    Models, EF Core (SQLite) data access, business logic services
  TradingJournal.App/     WPF UI (MVVM): Views, ViewModels, App/MainWindow shell
  TradingJournal.Tests/   xUnit tests for the calculation and ledger logic
```

Data is stored locally in a SQLite file at `%AppData%\TradingJournal\journal.db`, created automatically on first run.

## Building & running (Windows + Visual Studio)

1. Install **Visual Studio 2022** (17.8+) with the **.NET desktop development** workload.
2. Open `TradingJournal.sln`.
3. Set **TradingJournal.App** as the startup project.
4. Press **F5** to build and run.

Alternatively, from a terminal with the .NET 8 SDK installed:

```
dotnet run --project src/TradingJournal.App
```

## Running the tests

```
dotnet test
```
