using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// A single simulated trade produced by a Backtest run.
/// </summary>
public class BacktestTrade
{
    public long Id { get; set; }

    public int BacktestId { get; set; }

    public Backtest? Backtest { get; set; }

    public DateTime DateUtc { get; set; }

    public required string Asset { get; set; }

    public TradeDirection Direction { get; set; }

    public decimal EntryPrice { get; set; }

    public decimal ExitPrice { get; set; }

    public decimal Amount { get; set; }

    public decimal Payout { get; set; }

    public ExpiryType Expiry { get; set; }

    public TimeframeType Timeframe { get; set; }

    public int Confidence { get; set; }

    public TradeResultType Result { get; set; }

    public decimal ProfitLoss { get; set; }
}
