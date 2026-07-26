namespace FXVolumeTrader.Infrastructure.MarketData;

/// <summary>Bound from appsettings.json "MarketData:CsvReplay".</summary>
public sealed class CsvReplayMarketDataProviderOptions
{
    /// <summary>
    /// Path to a CSV file with one header line followed by rows of
    /// "Bid,Ask,Last,TimestampUtc[,SequenceNumber]". TimestampUtc must be
    /// parseable and is interpreted as UTC.
    /// </summary>
    public string FilePath { get; init; } = string.Empty;

    /// <summary>
    /// When true, ticks are yielded with real delays derived from their
    /// recorded timestamps (scaled by PlaybackSpeedMultiplier). When
    /// false (default), the file is replayed as fast as possible - useful
    /// for backtesting.
    /// </summary>
    public bool RealTimePlayback { get; init; }

    public double PlaybackSpeedMultiplier { get; init; } = 1.0;

    /// <summary>Upper bound on the delay applied between any two ticks during real-time playback.</summary>
    public TimeSpan MaxDelayBetweenTicks { get; init; } = TimeSpan.FromSeconds(2);
}
