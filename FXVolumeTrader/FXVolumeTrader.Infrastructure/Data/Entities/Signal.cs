using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// A generated CALL/PUT/NO TRADE signal with its full, transparent
/// confidence breakdown (see SignalScoreComponent). Never represents a
/// guaranteed outcome - ConfidenceScore is an estimate only.
/// </summary>
public class Signal
{
    public long Id { get; set; }

    public required string Symbol { get; set; }

    public TimeframeType Timeframe { get; set; }

    public ExpiryType Expiry { get; set; }

    public SignalType SignalType { get; set; }

    /// <summary>0-100 transparent confidence score. Not a probability guarantee.</summary>
    public int ConfidenceScore { get; set; }

    public required string Reason { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public long? CandleId { get; set; }

    public Candle? Candle { get; set; }

    public required string StrategyVersion { get; set; }

    public MarketCondition MarketCondition { get; set; }

    public int? TradingSessionId { get; set; }

    public TradingSession? TradingSession { get; set; }

    public ICollection<SignalScoreComponent> ScoreComponents { get; set; } = new List<SignalScoreComponent>();
}
