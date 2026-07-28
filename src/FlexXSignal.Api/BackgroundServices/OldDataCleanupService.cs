using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Prunes raw 1-minute candle history and stale data-health logs beyond their retention
/// window so the database does not grow unbounded. Signals and their verified results are never
/// deleted by this job — only raw market-data rows and operational logs.</summary>
public sealed class OldDataCleanupService : TimedBackgroundService
{
    private static readonly TimeSpan CandleRetention = TimeSpan.FromDays(90);
    private static readonly TimeSpan HealthLogRetention = TimeSpan.FromDays(30);
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromHours(6);

    public OldDataCleanupService(IServiceScopeFactory scopeFactory, ILogger<OldDataCleanupService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<OldDataCleanupService>>();

        var candleCutoff = DateTime.UtcNow - CandleRetention;
        var deletedCandles = await db.Candles.Where(c => c.OpenTimeUtc < candleCutoff).ExecuteDeleteAsync(ct);

        var healthCutoff = DateTime.UtcNow - HealthLogRetention;
        var deletedHealthLogs = await db.DataHealthLogs.Where(h => h.RecordedAtUtc < healthCutoff).ExecuteDeleteAsync(ct);

        if (deletedCandles > 0 || deletedHealthLogs > 0)
            logger.LogInformation("Cleanup removed {Candles} old candles and {HealthLogs} old health logs.", deletedCandles, deletedHealthLogs);
    }
}
