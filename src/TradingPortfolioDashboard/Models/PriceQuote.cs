namespace TradingPortfolioDashboard.Models;

public class PriceQuote
{
    public string Symbol { get; set; } = string.Empty;
    public decimal LastPrice { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
