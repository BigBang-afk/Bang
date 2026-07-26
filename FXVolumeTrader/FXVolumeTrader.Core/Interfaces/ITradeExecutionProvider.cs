using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Models;

namespace FXVolumeTrader.Core.Interfaces;

/// <summary>
/// Abstraction over trade execution. SupportsAutomaticExecution must be
/// false for any provider that cannot guarantee an official, authorized
/// broker API - ManualConfirmationExecutionProvider always returns false
/// and never submits a real trade on its own.
/// </summary>
public interface ITradeExecutionProvider
{
    bool SupportsAutomaticExecution { get; }

    Task<TradeExecutionResult> PlaceTradeAsync(
        TradeRequest request,
        CancellationToken cancellationToken);

    Task<TradeStatus> GetTradeStatusAsync(
        string tradeId,
        CancellationToken cancellationToken);
}
