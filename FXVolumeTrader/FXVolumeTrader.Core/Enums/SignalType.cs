namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Outcome of the signal engine for a given candle close. NoTrade is a first-class
/// result, not an absence of one - it must always carry a reason.
/// </summary>
public enum SignalType
{
    NoTrade = 0,
    Call = 1,
    Put = 2
}
