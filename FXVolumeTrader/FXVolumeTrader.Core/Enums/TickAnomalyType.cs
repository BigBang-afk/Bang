namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Categories of tick-feed problems detected by FeedHealthMonitor. Surfaced
/// to logs and, in aggregate, to the dashboard's connection-status
/// indicator - individual anomalies are never silently dropped.
/// </summary>
public enum TickAnomalyType
{
    DuplicateTick = 0,
    OutOfOrderTick = 1,
    MissingTimestamp = 2,
    InvalidPrice = 3,
    LargePriceGap = 4,
    DelayedFeed = 5
}
