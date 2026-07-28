using System.Net.Http.Headers;
using System.Text.Json;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

public sealed class AuthorizedRestProviderOptions
{
    /// <summary>Base URL of the authorized vendor's historical-candle REST API. Supplied by the operator.</summary>
    public string? BaseUrl { get; set; }
    public string? ApiKey { get; set; }
    public int ConnectionTimeoutSeconds { get; set; } = 15;
    public int MaxRetryAttempts { get; set; } = 3;
}

/// <summary>
/// Fully structured template for an authorized REST historical-candle provider. HTTP client
/// configuration, retry-with-backoff, response parsing and OHLC validation are complete;
/// only the vendor base URL/API key and the exact request/response shape in
/// <see cref="BuildRequestUri"/> / <see cref="ParseResponse"/> need to be adjusted for the
/// specific authorized vendor contract once it is available. No live streaming is implied here —
/// this provider only serves historical backfill (see AuthorizedWebSocketDataProvider for live ticks).
/// </summary>
public sealed class AuthorizedRestDataProvider : IMarketDataProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthorizedRestDataProvider> _logger;
    private AuthorizedRestProviderOptions _options = new();
    private ProviderConnectionStatus _status = ProviderConnectionStatus.Disconnected;

    public string ProviderName => "Authorized REST Feed";
    public MarketDataProviderType ProviderType => MarketDataProviderType.AuthorizedRest;
    public ProviderConnectionStatus ConnectionStatus => _status;
    public bool IsDemoData => false;

    public event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;
    public event EventHandler<ProviderDataErrorEventArgs>? DataError;

    public AuthorizedRestDataProvider(HttpClient httpClient, ILogger<AuthorizedRestDataProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public void Configure(AuthorizedRestProviderOptions options)
    {
        _options = options;
        if (!string.IsNullOrWhiteSpace(options.BaseUrl)) _httpClient.BaseAddress = new Uri(options.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(options.ConnectionTimeoutSeconds);
        if (!string.IsNullOrEmpty(options.ApiKey))
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
    }

    public Task ConnectAsync(CancellationToken ct = default)
    {
        _status = string.IsNullOrWhiteSpace(_options.BaseUrl) ? ProviderConnectionStatus.Faulted : ProviderConnectionStatus.Connected;
        if (_status == ProviderConnectionStatus.Faulted)
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "No authorized REST base URL configured." });
        return Task.CompletedTask;
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

        var uri = BuildRequestUri(pairSymbol, timeframe, fromUtc, toUtc);
        var attempt = 0;

        while (attempt < _options.MaxRetryAttempts)
        {
            try
            {
                using var response = await _httpClient.GetAsync(uri, ct);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync(ct);
                return ParseResponse(json, pairSymbol, timeframe);
            }
            catch (Exception ex)
            {
                attempt++;
                _logger.LogWarning(ex, "Authorized REST request attempt {Attempt}/{Max} failed for {Pair}.", attempt, _options.MaxRetryAttempts, pairSymbol);
                if (attempt >= _options.MaxRetryAttempts)
                {
                    DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pairSymbol, Message = $"Historical candle request failed after {attempt} attempts: {ex.Message}", Exception = ex });
                    return Array.Empty<ProviderCandle>();
                }
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), ct);
            }
        }

        return Array.Empty<ProviderCandle>();
    }

    public async Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        var candles = await GetHistoricalCandlesAsync(pairSymbol, timeframe, DateTime.UtcNow.AddMinutes(-30), DateTime.UtcNow, ct);
        return candles.OrderByDescending(c => c.OpenTimeUtc).FirstOrDefault();
    }

    public ProviderConnectionStatus GetConnectionStatus() => _status;

    /// <summary>Default assumed endpoint shape: GET /candles?pair=&timeframe=&from=&to=. Adjust for the actual vendor contract.</summary>
    private static string BuildRequestUri(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc) =>
        $"/candles?pair={Uri.EscapeDataString(pairSymbol)}&timeframe={(int)timeframe}&from={fromUtc:O}&to={toUtc:O}";

    /// <summary>Default assumed response shape: {"candles":[{"openTime":"...","open":..,"high":..,"low":..,"close":..,"volume":..}]}.</summary>
    private List<ProviderCandle> ParseResponse(string json, string pairSymbol, Timeframe timeframe)
    {
        var results = new List<ProviderCandle>();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("candles", out var candlesEl)) return results;

        foreach (var item in candlesEl.EnumerateArray())
        {
            try
            {
                var openTime = item.GetProperty("openTime").GetDateTime().ToUniversalTime();
                var open = item.GetProperty("open").GetDecimal();
                var high = item.GetProperty("high").GetDecimal();
                var low = item.GetProperty("low").GetDecimal();
                var close = item.GetProperty("close").GetDecimal();
                var volume = item.TryGetProperty("volume", out var volEl) ? volEl.GetDecimal() : 0m;

                if (high < Math.Max(open, close) || low > Math.Min(open, close) || high < low) continue;

                results.Add(new ProviderCandle
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
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipped malformed candle entry from authorized REST response.");
            }
        }

        return results;
    }
}
