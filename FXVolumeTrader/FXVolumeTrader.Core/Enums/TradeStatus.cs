namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Lifecycle status of a trade as reported by ITradeExecutionProvider.GetTradeStatusAsync.
/// </summary>
public enum TradeStatus
{
    Unknown = 0,
    PendingConfirmation = 1,
    Open = 2,
    Won = 3,
    Lost = 4,
    Draw = 5,
    Cancelled = 6
}
