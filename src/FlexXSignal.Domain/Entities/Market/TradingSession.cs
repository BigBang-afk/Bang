using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// A configured trading window (e.g. London, New York, OTC-24h) that scopes when
/// the signal engine is permitted to publish signals for a pair.
/// </summary>
public class TradingSession : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid? TradingPairId { get; set; }
    public TradingPair? TradingPair { get; set; }
    public TimeSpan StartUtc { get; set; }
    public TimeSpan EndUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public string DaysOfWeekMask { get; set; } = "1111111"; // Mon..Sun
    public int MaxSignalsPerHour { get; set; } = 6;
}
