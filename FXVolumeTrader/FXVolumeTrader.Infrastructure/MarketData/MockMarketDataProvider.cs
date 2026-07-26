using System.Runtime.CompilerServices;
using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FXVolumeTrader.Infrastructure.MarketData;

/// <summary>
/// Simulated tick source: a bounded random walk around a configurable base
/// price, ticking at a configurable interval. Entirely self-contained -
/// generates no network traffic and talks to no broker of any kind. Used
/// for development, demos, and the Live Signal-Only / Paper Trading modes
/// when no authorized real feed is configured.
/// </summary>
public sealed class MockMarketDataProvider : IMarketDataProvider
{
    private readonly MockMarketDataProviderOptions _options;
    private readonly ILogger<MockMarketDataProvider> _logger;
    private readonly Random _random = new();
    private long _sequence;
    private decimal _lastPrice;

    public MockMarketDataProvider(IOptions<MockMarketDataProviderOptions> options, ILogger<MockMarketDataProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
        _lastPrice = _options.BasePrice;
    }

    public bool IsConnected { get; private set; }

    public Task ConnectAsync(CancellationToken cancellationToken)
    {
        IsConnected = true;
        _logger.LogInformation("MockMarketDataProvider connected (simulated feed, base price {BasePrice}).", _options.BasePrice);
        return Task.CompletedTask;
    }

    public Task DisconnectAsync()
    {
        IsConnected = false;
        _logger.LogInformation("MockMarketDataProvider disconnected.");
        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<Tick> StreamTicksAsync(
        string symbol,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            await Task.Delay(_options.TickIntervalMilliseconds, cancellationToken);

            var step = ((decimal)_random.NextDouble() - 0.5m) * 2m * _options.VolatilityPerTick;
            var newPrice = Math.Max(0.00001m, _lastPrice + step);
            var direction = newPrice > _lastPrice
                ? TickDirection.Up
                : newPrice < _lastPrice
                    ? TickDirection.Down
                    : TickDirection.Neutral;
            _lastPrice = newPrice;

            yield return new Tick
            {
                Symbol = symbol,
                Bid = newPrice - _options.TypicalSpread / 2m,
                Ask = newPrice + _options.TypicalSpread / 2m,
                Last = newPrice,
                TimestampUtc = DateTime.UtcNow,
                Direction = direction,
                SequenceNumber = ++_sequence,
                DataSource = "Mock"
            };
        }
    }
}
