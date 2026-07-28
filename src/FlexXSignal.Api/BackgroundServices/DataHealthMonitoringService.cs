using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Records provider connection/data-quality health on a fixed cadence and broadcasts it to
/// admin dashboards, driving the visible "DEMO DATA" / connection-status indicators.</summary>
public sealed class DataHealthMonitoringService : TimedBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(30);

    public DataHealthMonitoringService(IServiceScopeFactory scopeFactory, ILogger<DataHealthMonitoringService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<IMarketDataProviderResolver>();
        var realtime = scope.ServiceProvider.GetRequiredService<ISignalRealtimeNotifier>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();

        var config = await db.MarketDataProviderConfigurations.FirstOrDefaultAsync(c => c.IsActive, ct);
        var provider = await resolver.GetActiveProviderAsync(ct);
        var status = provider.GetConnectionStatus();

        if (config is not null)
        {
            config.LastKnownStatus = status;
            if (status == ProviderConnectionStatus.Connected)
            {
                config.LastConnectedAtUtc = clock.UtcNow;
                config.LastDataReceivedAtUtc = clock.UtcNow;
            }

            var quality = status == ProviderConnectionStatus.Connected ? DataQualityStatus.Good : DataQualityStatus.Invalid;

            db.DataHealthLogs.Add(new DataHealthLog
            {
                MarketDataProviderConfigurationId = config.Id,
                ConnectionStatus = status,
                DataQuality = quality,
                LatencyMs = 0,
                Message = provider.IsDemoData ? "Demo data provider active (not live market data)." : null,
                RecordedAtUtc = clock.UtcNow
            });

            await db.SaveChangesAsync(ct);
            await realtime.NotifyProviderHealthAsync(new { provider.ProviderName, Status = status.ToString(), provider.IsDemoData }, ct);
        }
    }
}
