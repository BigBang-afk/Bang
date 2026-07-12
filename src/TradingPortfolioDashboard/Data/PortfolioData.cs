using System.Collections.Generic;
using TradingPortfolioDashboard.Models;

namespace TradingPortfolioDashboard.Data;

/// <summary>Root object persisted to disk as JSON.</summary>
public class PortfolioData
{
    public List<Trade> Trades { get; set; } = new();
    public List<PriceQuote> PriceQuotes { get; set; } = new();
}
