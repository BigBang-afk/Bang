namespace TradingPortfolioDashboard.Models;

public class Trade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Symbol { get; set; } = string.Empty;
    public TradeSide Side { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Fees { get; set; }
    public DateTime Date { get; set; } = DateTime.Now;
    public string? Notes { get; set; }

    public decimal GrossAmount => Quantity * Price;
    public decimal NetAmount => Side == TradeSide.Buy ? GrossAmount + Fees : GrossAmount - Fees;
}
