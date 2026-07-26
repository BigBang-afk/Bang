namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Candle build timeframes. Underlying values are seconds so the candle
/// builder can compute boundary math without a lookup table.
/// </summary>
public enum TimeframeType
{
    Seconds5 = 5,
    Seconds15 = 15,
    Seconds30 = 30,
    Minute1 = 60,
    Minutes3 = 180,
    Minutes5 = 300,
    Minutes15 = 900
}
