namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Coarse market-structure classification surfaced on the dashboard and
/// used by no-trade filters (e.g. Choppy/Ranging suppress signals).
/// </summary>
public enum MarketCondition
{
    Unknown = 0,
    Trending = 1,
    Ranging = 2,
    Choppy = 3,
    Breakout = 4,
    Reversal = 5
}
