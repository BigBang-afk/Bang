namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Supported option expiries. Underlying values are seconds. Each expiry
/// has its own configurable strategy rule set - see StrategyConfiguration.
/// </summary>
public enum ExpiryType
{
    Seconds15 = 15,
    Seconds30 = 30,
    Minute1 = 60,
    Minutes2 = 120,
    Minutes3 = 180,
    Minutes5 = 300
}
