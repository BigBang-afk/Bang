using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Common.Interfaces;

public sealed class ProviderCandle
{
    public required string PairSymbol { get; init; }
    public required Timeframe Timeframe { get; init; }
    public required DateTime OpenTimeUtc { get; init; }
    public required DateTime CloseTimeUtc { get; init; }
    public required decimal Open { get; init; }
    public required decimal High { get; init; }
    public required decimal Low { get; init; }
    public required decimal Close { get; init; }
    public decimal Volume { get; init; }
    public bool IsClosed { get; init; } = true;
    public DateTime ProviderTimestampUtc { get; init; }
    public DataQualityStatus DataQuality { get; init; } = DataQualityStatus.Good;
}

public sealed class ProviderDataErrorEventArgs : EventArgs
{
    public required string PairSymbol { get; init; }
    public required string Message { get; init; }
    public Exception? Exception { get; init; }
}

public sealed class ProviderDataReceivedEventArgs : EventArgs
{
    public required ProviderCandle Candle { get; init; }
}

/// <summary>
/// Contract every market data source implements: demo generator, CSV importer, or an
/// authorized live WebSocket/REST provider once credentials are supplied by the operator.
/// No implementation of this interface may automate trades or store third-party account credentials.
/// </summary>
public interface IMarketDataProvider
{
    string ProviderName { get; }
    MarketDataProviderType ProviderType { get; }
    ProviderConnectionStatus ConnectionStatus { get; }
    bool IsDemoData { get; }

    Task ConnectAsync(CancellationToken ct = default);
    Task DisconnectAsync(CancellationToken ct = default);
    Task SubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default);
    Task UnsubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default);
    Task<IReadOnlyList<ProviderCandle>> GetHistoricalCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default);
    ProviderConnectionStatus GetConnectionStatus();

    event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;
    event EventHandler<ProviderDataErrorEventArgs>? DataError;
}
