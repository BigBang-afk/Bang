namespace FXVolumeTrader.Core.Models;

/// <summary>
/// Result returned by ITradeExecutionProvider.PlaceTradeAsync. For manual
/// and paper providers this documents what was recorded, not a real
/// broker fill.
/// </summary>
public sealed class TradeExecutionResult
{
    public required bool Success { get; init; }

    /// <summary>Internal trade identifier, present when Success is true.</summary>
    public string? TradeId { get; init; }

    public required string Message { get; init; }

    public required DateTime TimestampUtc { get; init; }
}
