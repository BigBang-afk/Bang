using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

/// <summary>
/// Resolves the currently active IMarketDataProvider based on the admin-configured
/// MarketDataProviderConfiguration row. Background services always go through this resolver
/// instead of depending on a concrete provider directly.
/// </summary>
public interface IMarketDataProviderResolver
{
    Task<IMarketDataProvider> GetActiveProviderAsync(CancellationToken ct = default);
}

public sealed class MarketDataProviderResolver : IMarketDataProviderResolver
{
    private readonly AppDbContext _db;
    private readonly DemoMarketDataProvider _demo;
    private readonly CsvMarketDataProvider _csv;
    private readonly AuthorizedWebSocketDataProvider _webSocket;
    private readonly AuthorizedRestDataProvider _rest;
    private readonly QuotexMarketDataProvider _quotex;
    private readonly IApiKeyProtector _apiKeyProtector;

    public MarketDataProviderResolver(
        AppDbContext db,
        DemoMarketDataProvider demo,
        CsvMarketDataProvider csv,
        AuthorizedWebSocketDataProvider webSocket,
        AuthorizedRestDataProvider rest,
        QuotexMarketDataProvider quotex,
        IApiKeyProtector apiKeyProtector)
    {
        _db = db;
        _demo = demo;
        _csv = csv;
        _webSocket = webSocket;
        _rest = rest;
        _quotex = quotex;
        _apiKeyProtector = apiKeyProtector;
    }

    public async Task<IMarketDataProvider> GetActiveProviderAsync(CancellationToken ct = default)
    {
        var config = await _db.MarketDataProviderConfigurations.FirstOrDefaultAsync(c => c.IsActive, ct);
        if (config is null) return _demo;

        switch (config.ProviderType)
        {
            case MarketDataProviderType.AuthorizedWebSocket:
                _webSocket.Configure(new AuthorizedWebSocketProviderOptions
                {
                    Endpoint = config.ApiEndpoint,
                    ApiKey = DecryptApiKey(config.ApiKeyEncrypted),
                    ConnectionTimeoutSeconds = config.ConnectionTimeoutSeconds,
                    ReconnectIntervalSeconds = config.ReconnectIntervalSeconds,
                    MaxReconnectAttempts = config.MaxReconnectAttempts
                });
                return _webSocket;
            case MarketDataProviderType.AuthorizedRest:
                _rest.Configure(new AuthorizedRestProviderOptions
                {
                    BaseUrl = config.ApiEndpoint,
                    ApiKey = DecryptApiKey(config.ApiKeyEncrypted),
                    ConnectionTimeoutSeconds = config.ConnectionTimeoutSeconds
                });
                return _rest;
            case MarketDataProviderType.Quotex:
                _quotex.Configure(new QuotexProviderOptions
                {
                    BaseUrl = config.ApiEndpoint,
                    ApiKey = DecryptApiKey(config.ApiKeyEncrypted),
                    ConnectionTimeoutSeconds = config.ConnectionTimeoutSeconds
                });
                return _quotex;
            case MarketDataProviderType.Csv:
                return _csv;
            case MarketDataProviderType.Demo:
            default:
                return _demo;
        }
    }

    private string? DecryptApiKey(string? encrypted)
    {
        if (string.IsNullOrEmpty(encrypted)) return null;
        try { return _apiKeyProtector.Decrypt(encrypted); }
        catch { return null; }
    }
}
