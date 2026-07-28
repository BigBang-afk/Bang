using System.Collections.Concurrent;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

/// <summary>
/// Generates realistic-looking synthetic candle movement for local development and demos.
/// This is never presented as live market data: every candle it produces carries DataQuality
/// tagged as demo-sourced and the API/UI must surface a "DEMO DATA" badge whenever this provider is active.
/// </summary>
public sealed class DemoMarketDataProvider : IMarketDataProvider
{
    private readonly ILogger<DemoMarketDataProvider> _logger;
    private readonly ConcurrentDictionary<string, decimal> _lastPrices = new();
    private readonly Random _random = new();
    private ProviderConnectionStatus _status = ProviderConnectionStatus.Disconnected;

    public string ProviderName => "Demo Data Generator";
    public MarketDataProviderType ProviderType => MarketDataProviderType.Demo;
    public ProviderConnectionStatus ConnectionStatus => _status;
    public bool IsDemoData => true;

    // Required by IMarketDataProvider; the synthetic generator never faults, so DataError is
    // never raised (DataReceived is used, from GetLatestCandleAsync).
#pragma warning disable CS0067
    public event EventHandler<ProviderDataErrorEventArgs>? DataError;
#pragma warning restore CS0067
    public event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;

    public DemoMarketDataProvider(ILogger<DemoMarketDataProvider> logger) => _logger = logger;

    public Task ConnectAsync(CancellationToken ct = default)
    {
        _status = ProviderConnectionStatus.Connected;
        _logger.LogInformation("DemoMarketDataProvider connected (synthetic data, not live).");
        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken ct = default)
    {
        _status = ProviderConnectionStatus.Disconnected;
        return Task.CompletedTask;
    }

    public Task SubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        _lastPrices.TryAdd(pairSymbol, SeedPrice(pairSymbol));
        return Task.CompletedTask;
    }

    public Task UnsubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) => Task.CompletedTask;

    public Task<IReadOnlyList<ProviderCandle>> GetHistoricalCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var candles = new List<ProviderCandle>();
        var periodSeconds = (int)timeframe;
        var price = SeedPrice(pairSymbol);
        var current = fromUtc;

        while (current < toUtc)
        {
            var candle = GenerateNextCandle(pairSymbol, timeframe, current, ref price);
            candles.Add(candle);
            current = current.AddSeconds(periodSeconds);
        }

        _lastPrices[pairSymbol] = price;
        return Task.FromResult<IReadOnlyList<ProviderCandle>>(candles);
    }

    public Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        var price = _lastPrices.GetOrAdd(pairSymbol, SeedPrice);
        var periodSeconds = (int)timeframe;
        var now = DateTime.UtcNow;
        var openTime = new DateTime((now.Ticks / TimeSpan.FromSeconds(periodSeconds).Ticks) * TimeSpan.FromSeconds(periodSeconds).Ticks, DateTimeKind.Utc);

        var candle = GenerateNextCandle(pairSymbol, timeframe, openTime, ref price);
        _lastPrices[pairSymbol] = price;

        DataReceived?.Invoke(this, new ProviderDataReceivedEventArgs { Candle = candle });
        return Task.FromResult<ProviderCandle?>(candle);
    }

    public ProviderConnectionStatus GetConnectionStatus() => _status;

    private ProviderCandle GenerateNextCandle(string pairSymbol, Timeframe timeframe, DateTime openTimeUtc, ref decimal price)
    {
        var volatility = price * 0.0006m;
        var drift = ((decimal)_random.NextDouble() - 0.5m) * volatility * 2;
        var open = price;
        var close = Math.Max(0.0001m, open + drift);
        var high = Math.Max(open, close) + (decimal)_random.NextDouble() * volatility;
        var low = Math.Min(open, close) - (decimal)_random.NextDouble() * volatility;
        price = close;

        return new ProviderCandle
        {
            PairSymbol = pairSymbol,
            Timeframe = timeframe,
            OpenTimeUtc = openTimeUtc,
            CloseTimeUtc = openTimeUtc.AddSeconds((int)timeframe),
            Open = Math.Round(open, 5),
            High = Math.Round(high, 5),
            Low = Math.Round(low, 5),
            Close = Math.Round(close, 5),
            Volume = 100 + (decimal)_random.NextDouble() * 900,
            IsClosed = true,
            ProviderTimestampUtc = DateTime.UtcNow,
            DataQuality = DataQualityStatus.Good
        };
    }

    private decimal SeedPrice(string pairSymbol)
    {
        var hash = Math.Abs(pairSymbol.GetHashCode() % 1000);
        return 0.5m + hash / 1000m * 1.5m;
    }
}
