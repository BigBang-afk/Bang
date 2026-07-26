using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// Persisted tick, written for replay/audit purposes (e.g. CSV replay
/// capture, journal traceability). Live analysis operates on the
/// in-memory FXVolumeTrader.Core.Models.Tick and only persists selectively.
/// </summary>
public class TickRecord
{
    public long Id { get; set; }

    public required string Symbol { get; set; }

    public decimal Bid { get; set; }

    public decimal Ask { get; set; }

    public decimal Last { get; set; }

    public DateTime TimestampUtc { get; set; }

    public TickDirection Direction { get; set; }

    public long SequenceNumber { get; set; }

    public required string DataSource { get; set; }

    public int? TradingSessionId { get; set; }

    public TradingSession? TradingSession { get; set; }
}
