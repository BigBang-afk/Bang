# Trading Portfolio Dashboard

A Windows desktop app (WPF, .NET 8) for tracking your trading portfolio: positions, P&L, allocation, and a trade log — all stored locally, no broker API keys required to get started.

## Getting started (Visual Studio)

1. Install **Visual Studio 2022** (Community edition is fine) with the **.NET desktop development** workload.
2. Open `TradingPortfolioDashboard.sln`.
3. Set `TradingPortfolioDashboard` as the startup project (it's the only one) and press **F5**.
4. NuGet restores automatically on first build (CommunityToolkit.Mvvm, LiveChartsCore.SkiaSharpView.WPF, CsvHelper).

Data is stored as JSON at `%AppData%\TradingPortfolioDashboard\portfolio-data.json` — no database setup needed.

## Features

- **Dashboard**: portfolio value, unrealized/realized/total P&L, open position count, allocation donut chart, realized P&L over time, and an editable positions table (edit "Current Price" inline to mark positions to market).
- **Trade Log**: add/edit/delete trades, plus CSV import with flexible column matching (works with most broker export formats — looks for Symbol/Ticker, Side/Action, Quantity/Qty, Price, Fees/Commission, Date columns by common aliases).
- Cost basis and realized P&L use FIFO lot matching per symbol.

## Project layout

```
src/TradingPortfolioDashboard/
  Models/       Trade, Position, PriceQuote, EquityPoint
  Data/         JSON persistence (PortfolioStore, PortfolioData)
  Services/     PortfolioService (state + persistence), PortfolioCalculator (FIFO P&L), CsvImportService
  ViewModels/   MainViewModel, DashboardViewModel, TradesViewModel, AddTradeViewModel
  Views/        MainWindow, DashboardView, TradesView, AddTradeWindow
  Themes/       Dark theme resource dictionary
```

## Roadmap ideas

- Live price feed via a broker/exchange API (Alpaca, IBKR, etc.) instead of manual price entry
- Risk metrics: max drawdown, Sharpe ratio, exposure by sector
- Multi-portfolio / multi-account support
