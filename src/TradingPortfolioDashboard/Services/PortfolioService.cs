using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using TradingPortfolioDashboard.Data;
using TradingPortfolioDashboard.Models;

namespace TradingPortfolioDashboard.Services;

/// <summary>
/// In-memory portfolio state (trades + last known prices), backed by a local JSON file.
/// Owns all mutation so every change gets persisted immediately.
/// </summary>
public class PortfolioService
{
    private readonly PortfolioStore _store;
    private readonly Dictionary<string, PriceQuote> _priceQuotes;

    public ObservableCollection<Trade> Trades { get; }

    public event Action? DataChanged;

    public PortfolioService(PortfolioStore store)
    {
        _store = store;
        var data = _store.Load();

        Trades = new ObservableCollection<Trade>(data.Trades.OrderBy(t => t.Date));
        _priceQuotes = data.PriceQuotes.ToDictionary(p => p.Symbol, StringComparer.OrdinalIgnoreCase);
    }

    public void AddTrade(Trade trade)
    {
        Trades.Add(trade);
        Save();
        DataChanged?.Invoke();
    }

    public void UpdateTrade(Trade trade)
    {
        Save();
        DataChanged?.Invoke();
    }

    public void DeleteTrade(Trade trade)
    {
        Trades.Remove(trade);
        Save();
        DataChanged?.Invoke();
    }

    public int ImportTrades(IEnumerable<Trade> trades)
    {
        var count = 0;
        foreach (var trade in trades)
        {
            Trades.Add(trade);
            count++;
        }

        Save();
        DataChanged?.Invoke();
        return count;
    }

    public void SetPrice(string symbol, decimal price)
    {
        _priceQuotes[symbol] = new PriceQuote { Symbol = symbol, LastPrice = price, UpdatedAt = DateTime.Now };
        Save();
        DataChanged?.Invoke();
    }

    public IReadOnlyDictionary<string, decimal> GetLastPrices()
        => _priceQuotes.ToDictionary(kv => kv.Key, kv => kv.Value.LastPrice, StringComparer.OrdinalIgnoreCase);

    public List<Position> GetPositions() => PortfolioCalculator.BuildPositions(Trades, GetLastPrices());

    public List<EquityPoint> GetEquityCurve() => PortfolioCalculator.BuildEquityCurve(Trades);

    private void Save()
    {
        _store.Save(new PortfolioData
        {
            Trades = Trades.ToList(),
            PriceQuotes = _priceQuotes.Values.ToList()
        });
    }
}
