using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// An audit record of the risk-management engine blocking a trade or
/// forcing a stop. Powers the risk-settings screen's activity log.
/// </summary>
public class RiskEvent
{
    public long Id { get; set; }

    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;

    public RiskEventType EventType { get; set; }

    public required string Description { get; set; }

    public int? TradingSessionId { get; set; }

    public TradingSession? TradingSession { get; set; }
}
