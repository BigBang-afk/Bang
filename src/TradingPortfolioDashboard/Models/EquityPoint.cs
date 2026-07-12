using System;

namespace TradingPortfolioDashboard.Models;

public class EquityPoint
{
    public DateTime Date { get; set; }
    public decimal CumulativeRealizedPnL { get; set; }
}
