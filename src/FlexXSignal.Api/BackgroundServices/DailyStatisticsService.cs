using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Recomputes and logs the previous day's headline stats once per hour, and persists them
/// as SystemSetting rows (category "DailyStats") so the admin performance dashboard has a cheap,
/// pre-aggregated read path in addition to the live on-demand queries in ISignalService.</summary>
public sealed class DailyStatisticsService : TimedBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromHours(1);

    public DailyStatisticsService(IServiceScopeFactory scopeFactory, ILogger<DailyStatisticsService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<DailyStatisticsService>>();

        var todayStart = DateTime.UtcNow.Date;
        var verifiedToday = await db.Signals.Where(s => s.EntryTimeUtc >= todayStart &&
                (s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie))
            .ToListAsync(ct);

        var wins = verifiedToday.Count(s => s.Status == SignalStatus.Win);
        var winRate = verifiedToday.Count == 0 ? 0 : Math.Round(100m * wins / verifiedToday.Count, 2);

        await UpsertSettingAsync(db, "DailyStats.Date", todayStart.ToString("O"), ct);
        await UpsertSettingAsync(db, "DailyStats.SignalCount", verifiedToday.Count.ToString(), ct);
        await UpsertSettingAsync(db, "DailyStats.WinRate", winRate.ToString("F2"), ct);

        logger.LogInformation("Daily stats refreshed: {Count} verified signals today, {WinRate}% win rate.", verifiedToday.Count, winRate);
    }

    private static async Task UpsertSettingAsync(AppDbContext db, string key, string value, CancellationToken ct)
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting is null)
        {
            db.SystemSettings.Add(new Domain.Entities.SystemSetting { Key = key, Value = value, Category = "DailyStats", DataType = "string" });
        }
        else
        {
            setting.Value = value;
            setting.UpdatedAtUtc = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }
}
