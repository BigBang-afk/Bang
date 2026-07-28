using System.Text.Json;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

public sealed class QuotexProviderOptions
{
    /// <summary>Base URL of the quotex-sidecar service — either an internal Docker/Railway address,
    /// or a public tunnel URL if the sidecar is self-hosted outside this deployment's network.</summary>
    public string? BaseUrl { get; set; }
    /// <summary>Shared secret sent as X-Sidecar-Key. Required when BaseUrl is publicly reachable
    /// (e.g. a tunnel); the sidecar itself decides whether to enforce it.</summary>
    public string? ApiKey { get; set; }
    public int ConnectionTimeoutSeconds { get; set; } = 15;
}

/// <summary>
/// Reads read-only candle data from the quotex-sidecar service, which is the only component that
/// ever holds Quotex account credentials (as its own process env vars, never persisted by this
/// application). This provider has no knowledge of those credentials and calls no trading
/// endpoint on the sidecar — the sidecar itself exposes candle retrieval only, never buy/sell.
/// </summary>
public sealed class QuotexMarketDataProvider : IMarketDataProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<QuotexMarketDataProvider> _logger;
    private QuotexProviderOptions _options = new();
    private ProviderConnectionStatus _status = ProviderConnectionStatus.Disconnected;

    public string ProviderName => "Quotex (Read-Only Quotes)";
    public MarketDataProviderType ProviderType => MarketDataProviderType.Quotex;
    public ProviderConnectionStatus ConnectionStatus => _status;
    public bool IsDemoData => false;

#pragma warning disable CS0067
    public event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;
#pragma warning restore CS0067
    public event EventHandler<ProviderDataErrorEventArgs>? DataError;

    public QuotexMarketDataProvider(HttpClient httpClient, ILogger<QuotexMarketDataProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public void Configure(QuotexProviderOptions options)
    {
        _options = options;
        if (!string.IsNullOrWhiteSpace(options.BaseUrl)) _httpClient.BaseAddress = new Uri(options.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(options.ConnectionTimeoutSeconds);
        _httpClient.DefaultRequestHeaders.Remove("X-Sidecar-Key");
        if (!string.IsNullOrEmpty(options.ApiKey))
            _httpClient.DefaultRequestHeaders.Add("X-Sidecar-Key", options.ApiKey);
    }

    public async Task ConnectAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            _status = ProviderConnectionStatus.Faulted;
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "No quotex-sidecar base URL configured." });
            return;
        }

        try
        {
            using var response = await _httpClient.GetAsync("/health", ct);
            response.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var connectedToQuotex = doc.RootElement.TryGetProperty("connectedToQuotex", out var el) && el.GetBoolean();
            _status = connectedToQuotex ? ProviderConnectionStatus.Connected : ProviderConnectionStatus.Faulted;
        }
        catch (Exception ex)
        {
            _status = ProviderConnectionStatus.Faulted;
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = $"quotex-sidecar health check failed: {ex.Message}", Exception = ex });
        }
    }

    public Task DisconnectAsync(CancellationToken ct = default)
    {
        _status = ProviderConnectionStatus.Disconnected;
        return Task.CompletedTask;
    }

    public Task SubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) => Task.CompletedTask;
    public Task UnsubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) => Task.CompletedTask;

    public async Task<IReadOnlyList<ProviderCandle>> GetHistoricalCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        if (_status != ProviderConnectionStatus.Connected)
        {
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pairSymbol, Message = "Provider is not connected." });
            return Array.Empty<ProviderCandle>();
        }

        var periodSeconds = (int)timeframe;
        var offsetSeconds = Math.Max(periodSeconds, (int)(toUtc - fromUtc).TotalSeconds);

        try
        {
            var uri = $"/candles?asset={Uri.EscapeDataString(pairSymbol)}&period={periodSeconds}&offsetSeconds={offsetSeconds}";
            using var response = await _httpClient.GetAsync(uri, ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);
            return ParseCandles(json, pairSymbol, timeframe)
                .Where(c => c.OpenTimeUtc >= fromUtc && c.OpenTimeUtc < toUtc)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "quotex-sidecar candle request failed for {Pair}.", pairSymbol);
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pairSymbol, Message = $"Candle request failed: {ex.Message}", Exception = ex });
            return Array.Empty<ProviderCandle>();
        }
    }

    public async Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        if (_status != ProviderConnectionStatus.Connected)
        {
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pairSymbol, Message = "Provider is not connected." });
            return null;
        }

        try
        {
            var uri = $"/candles/latest?asset={Uri.EscapeDataString(pairSymbol)}&period={(int)timeframe}";
            using var response = await _httpClient.GetAsync(uri, ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);

            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("candle", out var candleEl)) return null;

            var candle = ParseCandleElement(candleEl, pairSymbol, timeframe);
            if (candle is not null) DataReceived?.Invoke(this, new ProviderDataReceivedEventArgs { Candle = candle });
            return candle;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "quotex-sidecar latest-candle request failed for {Pair}.", pairSymbol);
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pairSymbol, Message = $"Latest candle request failed: {ex.Message}", Exception = ex });
            return null;
        }
    }

    public ProviderConnectionStatus GetConnectionStatus() => _status;

    private List<ProviderCandle> ParseCandles(string json, string pairSymbol, Timeframe timeframe)
    {
        var results = new List<ProviderCandle>();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("candles", out var candlesEl)) return results;

        foreach (var item in candlesEl.EnumerateArray())
        {
            var candle = ParseCandleElement(item, pairSymbol, timeframe);
            if (candle is not null) results.Add(candle);
        }

        return results;
    }

    private ProviderCandle? ParseCandleElement(JsonElement item, string pairSymbol, Timeframe timeframe)
    {
        try
        {
            var openTime = DateTimeOffset.FromUnixTimeSeconds(item.GetProperty("openTimeUnix").GetInt64()).UtcDateTime;
            var open = item.GetProperty("open").GetDecimal();
            var high = item.GetProperty("high").GetDecimal();
            var low = item.GetProperty("low").GetDecimal();
            var close = item.GetProperty("close").GetDecimal();
            var volume = item.TryGetProperty("volume", out var volEl) ? volEl.GetDecimal() : 0m;

            if (high < Math.Max(open, close) || low > Math.Min(open, close) || high < low) return null;

            return new ProviderCandle
            {
                PairSymbol = pairSymbol,
                Timeframe = timeframe,
                OpenTimeUtc = openTime,
                CloseTimeUtc = openTime.AddSeconds((int)timeframe),
                Open = open,
                High = high,
                Low = low,
                Close = close,
                Volume = volume,
                IsClosed = true,
                ProviderTimestampUtc = DateTime.UtcNow,
                DataQuality = DataQualityStatus.Good
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Skipped malformed candle entry from quotex-sidecar response.");
            return null;
        }
    }
}
