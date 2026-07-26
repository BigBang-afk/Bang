using FXVolumeTrader.Core.Models;

namespace FXVolumeTrader.Core.Interfaces;

/// <summary>
/// Abstraction over any source of live or replayed tick data. Implementations
/// must never scrape, reverse-engineer, or otherwise obtain data through an
/// unofficial/unauthorized broker connection - see MockMarketDataProvider,
/// CsvReplayMarketDataProvider, and OfficialApiMarketDataProvider.
/// </summary>
public interface IMarketDataProvider
{
    Task ConnectAsync(CancellationToken cancellationToken);

    Task DisconnectAsync();

    IAsyncEnumerable<Tick> StreamTicksAsync(
        string symbol,
        CancellationToken cancellationToken);

    bool IsConnected { get; }
}
