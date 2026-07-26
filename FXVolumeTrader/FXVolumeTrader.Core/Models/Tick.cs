using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Core.Models;

/// <summary>
/// A single price update from an IMarketDataProvider. Immutable by convention -
/// once constructed a tick must never be mutated, since candles and analysis
/// results are derived from it and must remain reproducible.
/// </summary>
public sealed class Tick
{
    public required string Symbol { get; init; }

    public required decimal Bid { get; init; }

    public required decimal Ask { get; init; }

    public required decimal Last { get; init; }

    public required DateTime TimestampUtc { get; init; }

    public TickDirection Direction { get; init; } = TickDirection.Neutral;

    /// <summary>
    /// Monotonically increasing per-symbol sequence number assigned by the
    /// provider. Used to detect duplicate, out-of-order, and missing ticks.
    /// </summary>
    public required long SequenceNumber { get; init; }

    /// <summary>
    /// Name of the originating IMarketDataProvider (e.g. "Mock", "CsvReplay").
    /// Never identifies an unofficial/scraped broker connection.
    /// </summary>
    public required string DataSource { get; init; }

    public decimal Spread => Ask - Bid;

    public bool IsValid =>
        Bid > 0 && Ask > 0 && Last > 0 && Ask >= Bid && TimestampUtc != default;
}
