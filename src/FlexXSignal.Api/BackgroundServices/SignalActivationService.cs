using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Notifications;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>
/// Drives the Scheduled -> Waiting -> Active status transitions, broadcasts countdown ticks over
/// SignalR, and captures the real entry price from the first closed candle at/after entry time.
/// If no candle arrives within a grace period the signal is marked DataError rather than silently
/// guessing a price.
/// </summary>
public sealed class SignalActivationService : TimedBackgroundService
{
    private static readonly TimeSpan WaitingWindow = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan EntryDataGracePeriod = TimeSpan.FromSeconds(45);
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(3);

    public SignalActivationService(IServiceScopeFactory scopeFactory, ILogger<SignalActivationService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var realtime = scope.ServiceProvider.GetRequiredService<ISignalRealtimeNotifier>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();
        var now = clock.UtcNow;

        var scheduled = await db.Signals.Where(s => s.Status == SignalStatus.Scheduled && s.EntryTimeUtc - now <= WaitingWindow).ToListAsync(ct);
        foreach (var s in scheduled) s.Status = SignalStatus.Waiting;
        if (scheduled.Count > 0) await db.SaveChangesAsync(ct);

        var waiting = await db.Signals.Where(s => s.Status == SignalStatus.Waiting).ToListAsync(ct);
        foreach (var s in waiting)
        {
            var secondsRemaining = (int)Math.Max(0, (s.EntryTimeUtc - now).TotalSeconds);
            await realtime.NotifySignalCountdownAsync(s.Id, secondsRemaining, ct);

            if (now >= s.EntryTimeUtc)
            {
                var entryCandle = await db.Candles.AsNoTracking()
                    .Where(c => c.TradingPairId == s.TradingPairId && c.Timeframe == Timeframe.Minute1 && c.OpenTimeUtc <= s.EntryTimeUtc && c.IsClosed)
                    .OrderByDescending(c => c.OpenTimeUtc)
                    .FirstOrDefaultAsync(ct);

                if (entryCandle is not null)
                {
                    s.EntryPrice = entryCandle.Close;
                    s.Status = SignalStatus.Active;
                    s.ActivatedAtUtc = now;
                    await db.SaveChangesAsync(ct);
                    await realtime.NotifySignalActivatedAsync(s.Id, ct);
                    await notifications.DispatchSignalNotificationAsync(s.Id, NotificationType.SignalActivated, ct);
                }
                else if (now - s.EntryTimeUtc > EntryDataGracePeriod)
                {
                    s.Status = SignalStatus.DataError;
                    await db.SaveChangesAsync(ct);
                    await realtime.NotifySignalResultAsync(s.Id, SignalStatus.DataError, ct);
                }
            }
        }
    }
}
