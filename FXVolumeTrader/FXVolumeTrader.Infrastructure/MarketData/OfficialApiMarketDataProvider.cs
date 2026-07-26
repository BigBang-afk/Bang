using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Core.Models;
using Microsoft.Extensions.Logging;

namespace FXVolumeTrader.Infrastructure.MarketData;

/// <summary>
/// Placeholder for a future market-data connection to a broker's official,
/// authorized API. Intentionally non-functional until such an API and its
/// credentials are configured - this class must never be implemented
/// against an unofficial, scraped, or reverse-engineered connection
/// (see the project's broker-integration restrictions).
/// </summary>
public sealed class OfficialApiMarketDataProvider : IMarketDataProvider
{
    private readonly ILogger<OfficialApiMarketDataProvider> _logger;

    public OfficialApiMarketDataProvider(ILogger<OfficialApiMarketDataProvider> logger)
    {
        _logger = logger;
    }

    public bool IsConnected => false;

    public Task ConnectAsync(CancellationToken cancellationToken)
    {
        _logger.LogWarning("OfficialApiMarketDataProvider.ConnectAsync was called but no official broker API is configured.");
        throw new NotSupportedException(
            "No official, authorized market-data API is configured. Implement and configure this provider only " +
            "against a broker's official API and credentials.");
    }

    public Task DisconnectAsync() => Task.CompletedTask;

    public IAsyncEnumerable<Tick> StreamTicksAsync(string symbol, CancellationToken cancellationToken) =>
        throw new NotSupportedException(
            "No official, authorized market-data API is configured. Implement and configure this provider only " +
            "against a broker's official API and credentials.");
}
