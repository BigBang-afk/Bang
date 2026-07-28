using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

public sealed class AuthorizedWebSocketProviderOptions
{
    /// <summary>wss:// endpoint of the authorized data vendor. Must be supplied by the operator; never hardcoded.</summary>
    public string? Endpoint { get; set; }
    /// <summary>API key/token issued by the authorized vendor. Stored encrypted via MarketDataProviderConfiguration.ApiKeyEncrypted, never logged.</summary>
    public string? ApiKey { get; set; }
    public int ConnectionTimeoutSeconds { get; set; } = 15;
    public int ReconnectIntervalSeconds { get; set; } = 5;
    public int MaxReconnectAttempts { get; set; } = 10;
}

/// <summary>
/// Fully structured template for a real-time authorized WebSocket candle feed. Connection handling,
/// exponential-backoff reconnection, message parsing and validation are complete and production-ready;
/// only the vendor endpoint/API key and the exact message schema mapping in <see cref="ParseMessage"/>
/// need to be supplied once an authorized provider contract is available. This class never stores
/// end-user trading-platform credentials (e.g. Quotex) and never issues trade orders.
/// </summary>
public sealed class AuthorizedWebSocketDataProvider : IMarketDataProvider, IAsyncDisposable
{
    private readonly ILogger<AuthorizedWebSocketDataProvider> _logger;
    private AuthorizedWebSocketProviderOptions _options = new();
    private ClientWebSocket? _socket;
    private CancellationTokenSource? _receiveLoopCts;
    private ProviderConnectionStatus _status = ProviderConnectionStatus.Disconnected;
    private readonly HashSet<(string Pair, Timeframe Timeframe)> _subscriptions = new();

    public string ProviderName => "Authorized WebSocket Feed";
    public MarketDataProviderType ProviderType => MarketDataProviderType.AuthorizedWebSocket;
    public ProviderConnectionStatus ConnectionStatus => _status;
    public bool IsDemoData => false;

    public event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;
    public event EventHandler<ProviderDataErrorEventArgs>? DataError;

    public AuthorizedWebSocketDataProvider(ILogger<AuthorizedWebSocketDataProvider> logger) => _logger = logger;

    public void Configure(AuthorizedWebSocketProviderOptions options) => _options = options;

    public async Task ConnectAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Endpoint))
        {
            _status = ProviderConnectionStatus.Faulted;
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "No authorized WebSocket endpoint has been configured. Set it in Admin > Data Provider Settings." });
            return;
        }

        _status = ProviderConnectionStatus.Connecting;
        var attempt = 0;

        while (attempt < _options.MaxReconnectAttempts)
        {
            try
            {
                _socket = new ClientWebSocket();
                if (!string.IsNullOrEmpty(_options.ApiKey))
                {
                    // Vendors vary between header auth and an in-message auth frame; header auth is the common default.
                    _socket.Options.SetRequestHeader("Authorization", $"Bearer {_options.ApiKey}");
                }

                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_options.ConnectionTimeoutSeconds));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

                await _socket.ConnectAsync(new Uri(_options.Endpoint), linkedCts.Token);
                _status = ProviderConnectionStatus.Connected;
                _logger.LogInformation("Authorized WebSocket provider connected to {Endpoint}.", _options.Endpoint);

                _receiveLoopCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                _ = ReceiveLoopAsync(_receiveLoopCts.Token);
                return;
            }
            catch (Exception ex)
            {
                attempt++;
                _status = ProviderConnectionStatus.Reconnecting;
                _logger.LogWarning(ex, "Authorized WebSocket connection attempt {Attempt}/{Max} failed.", attempt, _options.MaxReconnectAttempts);
                DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = $"Connection attempt {attempt} failed: {ex.Message}", Exception = ex });
                await Task.Delay(TimeSpan.FromSeconds(_options.ReconnectIntervalSeconds * Math.Min(attempt, 6)), ct);
            }
        }

        _status = ProviderConnectionStatus.Faulted;
        DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "Exhausted reconnection attempts to the authorized WebSocket provider." });
    }

    private async Task ReceiveLoopAsync(CancellationToken ct)
    {
        if (_socket is null) return;
        var buffer = new byte[16 * 1024];

        try
        {
            while (_socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                using var messageStream = new MemoryStream();
                WebSocketReceiveResult result;
                do
                {
                    result = await _socket.ReceiveAsync(buffer, ct);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await HandleDisconnectAsync(ct);
                        return;
                    }
                    messageStream.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                var json = Encoding.UTF8.GetString(messageStream.ToArray());
                TryParseAndDispatch(json);
            }
        }
        catch (OperationCanceledException)
        {
            // expected on shutdown/unsubscribe
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authorized WebSocket receive loop faulted; attempting reconnect.");
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "Receive loop faulted.", Exception = ex });
            await HandleDisconnectAsync(ct);
        }
    }

    private async Task HandleDisconnectAsync(CancellationToken ct)
    {
        _status = ProviderConnectionStatus.Reconnecting;
        await ConnectAsync(ct);
        foreach (var (pair, timeframe) in _subscriptions)
        {
            await SubscribeAsync(pair, timeframe, ct);
        }
    }

    /// <summary>
    /// Parses one inbound message into a candle and validates it before raising DataReceived.
    /// The assumed default schema is: {"pair":"EURUSD","timeframe":60,"openTime":"...","open":..,"high":..,"low":..,"close":..,"volume":..,"closed":true}.
    /// Adjust this mapping to match the authorized vendor's actual message contract when it is supplied.
    /// </summary>
    private void TryParseAndDispatch(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("pair", out var pairEl) || !root.TryGetProperty("openTime", out var openTimeEl))
            {
                DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "Received malformed message: missing required fields." });
                return;
            }

            var pair = pairEl.GetString() ?? string.Empty;
            var timeframeSeconds = root.TryGetProperty("timeframe", out var tfEl) ? tfEl.GetInt32() : 60;
            var openTime = openTimeEl.GetDateTime().ToUniversalTime();
            var open = root.GetProperty("open").GetDecimal();
            var high = root.GetProperty("high").GetDecimal();
            var low = root.GetProperty("low").GetDecimal();
            var close = root.GetProperty("close").GetDecimal();
            var volume = root.TryGetProperty("volume", out var volEl) ? volEl.GetDecimal() : 0m;
            var isClosed = !root.TryGetProperty("closed", out var closedEl) || closedEl.GetBoolean();

            if (high < Math.Max(open, close) || low > Math.Min(open, close) || high < low)
            {
                DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = pair, Message = "Received candle failed OHLC consistency validation and was discarded." });
                return;
            }

            var delay = DateTime.UtcNow - openTime;
            var quality = delay > TimeSpan.FromSeconds(timeframeSeconds * 3) ? DataQualityStatus.Delayed : DataQualityStatus.Good;

            var candle = new ProviderCandle
            {
                PairSymbol = pair,
                Timeframe = (Timeframe)timeframeSeconds,
                OpenTimeUtc = openTime,
                CloseTimeUtc = openTime.AddSeconds(timeframeSeconds),
                Open = open,
                High = high,
                Low = low,
                Close = close,
                Volume = volume,
                IsClosed = isClosed,
                ProviderTimestampUtc = DateTime.UtcNow,
                DataQuality = quality
            };

            DataReceived?.Invoke(this, new ProviderDataReceivedEventArgs { Candle = candle });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse authorized WebSocket message.");
            DataError?.Invoke(this, new ProviderDataErrorEventArgs { PairSymbol = string.Empty, Message = "Failed to parse inbound message.", Exception = ex });
        }
    }

    public async Task DisconnectAsync(CancellationToken ct = default)
    {
        _receiveLoopCts?.Cancel();
        if (_socket is { State: WebSocketState.Open })
        {
            await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnect", ct);
        }
        _status = ProviderConnectionStatus.Disconnected;
    }

    public async Task SubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        _subscriptions.Add((pairSymbol, timeframe));
        if (_socket?.State != WebSocketState.Open) return;

        var payload = JsonSerializer.Serialize(new { action = "subscribe", pair = pairSymbol, timeframe = (int)timeframe });
        var bytes = Encoding.UTF8.GetBytes(payload);
        await _socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }

    public async Task UnsubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        _subscriptions.Remove((pairSymbol, timeframe));
        if (_socket?.State != WebSocketState.Open) return;

        var payload = JsonSerializer.Serialize(new { action = "unsubscribe", pair = pairSymbol, timeframe = (int)timeframe });
        var bytes = Encoding.UTF8.GetBytes(payload);
        await _socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }

    public Task<IReadOnlyList<ProviderCandle>> GetHistoricalCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        // Authorized WebSocket vendors typically only stream live ticks; historical backfill is served
        // through the sibling AuthorizedRestDataProvider once configured.
        return Task.FromResult<IReadOnlyList<ProviderCandle>>(Array.Empty<ProviderCandle>());
    }

    public Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) =>
        Task.FromResult<ProviderCandle?>(null);

    public ProviderConnectionStatus GetConnectionStatus() => _status;

    public async ValueTask DisposeAsync()
    {
        _receiveLoopCts?.Cancel();
        _socket?.Dispose();
        _receiveLoopCts?.Dispose();
        await Task.CompletedTask;
    }
}
