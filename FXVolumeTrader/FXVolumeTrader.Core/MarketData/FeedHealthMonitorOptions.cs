namespace FXVolumeTrader.Core.MarketData;

/// <summary>Thresholds used by FeedHealthMonitor to classify anomalies.</summary>
public sealed class FeedHealthMonitorOptions
{
    /// <summary>A tick older than this (wall-clock vs its timestamp) is considered delayed.</summary>
    public int MaxFeedDelaySeconds { get; init; } = 5;

    /// <summary>A tick-to-tick price move larger than this percentage is flagged as a large gap.</summary>
    public decimal MaxPriceGapPercentage { get; init; } = 1.0m;
}
