using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Watches the active market data provider and attempts to reconnect whenever it is
/// disconnected or faulted, using the provider's own configured reconnect interval.</summary>
public sealed class ProviderReconnectionService : TimedBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(10);

    public ProviderReconnectionService(IServiceScopeFactory scopeFactory, ILogger<ProviderReconnectionService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<IMarketDataProviderResolver>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ProviderReconnectionService>>();

        var config = await db.MarketDataProviderConfigurations.AsNoTracking().FirstOrDefaultAsync(c => c.IsActive, ct);
        var provider = await resolver.GetActiveProviderAsync(ct);
        var status = provider.GetConnectionStatus();

        if (status is ProviderConnectionStatus.Disconnected or ProviderConnectionStatus.Faulted)
        {
            logger.LogInformation("Attempting to (re)connect to {Provider} (status: {Status}).", provider.ProviderName, status);
            await provider.ConnectAsync(ct);

            if (config is not null)
            {
                var pairs = await db.TradingPairs.AsNoTracking().Where(p => p.IsActive).ToListAsync(ct);
                foreach (var pair in pairs)
                {
                    await provider.SubscribeAsync(pair.ProviderSymbolMapping, Timeframe.Minute1, ct);
                }
            }
        }
    }
}
