namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Final, user-recorded (or backtest-computed) outcome of a trade.
/// </summary>
public enum TradeResultType
{
    Pending = 0,
    Win = 1,
    Loss = 2,
    Draw = 3,
    Cancelled = 4
}
