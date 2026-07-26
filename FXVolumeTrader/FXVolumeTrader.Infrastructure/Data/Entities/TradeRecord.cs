using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// A single journaled trade - manual (Quotex assistant), paper, or
/// official-API. This is the backbone of the trading journal and
/// performance analytics pages.
/// </summary>
public class TradeRecord
{
    public long Id { get; set; }

    /// <summary>External broker/paper trade id, when one exists.</summary>
    public string? TradeIdExternal { get; set; }

    public DateTime DateUtc { get; set; } = DateTime.UtcNow;

    public required string Asset { get; set; }

    public TradeDirection Direction { get; set; }

    public decimal EntryPrice { get; set; }

    public decimal? ExitPrice { get; set; }

    public decimal Amount { get; set; }

    public decimal? Payout { get; set; }

    public ExpiryType Expiry { get; set; }

    public TimeframeType Timeframe { get; set; }

    public int? SignalConfidence { get; set; }

    public string? SignalReason { get; set; }

    public required string StrategyVersion { get; set; }

    public MarketCondition MarketCondition { get; set; }

    public TradeResultType Result { get; set; } = TradeResultType.Pending;

    public decimal? ProfitLoss { get; set; }

    public string? ScreenshotPath { get; set; }

    public string? Notes { get; set; }

    public required string DataSource { get; set; }

    public TradingMode Mode { get; set; }

    public long? SignalId { get; set; }

    public Signal? Signal { get; set; }

    public int? TradingSessionId { get; set; }

    public TradingSession? TradingSession { get; set; }
}
