using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Notifications;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.SignalEngine.Engine;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>
/// Verifies Active signals once their expiration time has passed: Win/Loss/Tie is determined purely
/// from the real expiration-candle close price against the recorded entry price, per the documented
/// UP/DOWN rules. Once written, the SignalResult is locked and immutable outside the audited
/// admin-correction workflow.
/// </summary>
public sealed class ResultVerificationService : TimedBackgroundService
{
    private static readonly TimeSpan VerificationGracePeriod = TimeSpan.FromSeconds(90);
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(5);

    public ResultVerificationService(IServiceScopeFactory scopeFactory, ILogger<ResultVerificationService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var realtime = scope.ServiceProvider.GetRequiredService<ISignalRealtimeNotifier>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();
        var now = clock.UtcNow;

        var active = await db.Signals.Where(s => s.Status == SignalStatus.Active && s.ExpirationTimeUtc <= now).ToListAsync(ct);

        foreach (var signal in active)
        {
            var expirationCandle = await db.Candles.AsNoTracking()
                .Where(c => c.TradingPairId == signal.TradingPairId && c.Timeframe == Timeframe.Minute1 && c.OpenTimeUtc <= signal.ExpirationTimeUtc && c.IsClosed)
                .OrderByDescending(c => c.OpenTimeUtc)
                .FirstOrDefaultAsync(ct);

            if (expirationCandle is null)
            {
                if (now - signal.ExpirationTimeUtc > VerificationGracePeriod)
                {
                    signal.Status = SignalStatus.DataError;
                    await db.SaveChangesAsync(ct);
                    await realtime.NotifySignalResultAsync(signal.Id, SignalStatus.DataError, ct);
                }
                continue;
            }

            var expirationPrice = expirationCandle.Close;
            var entryPrice = signal.EntryPrice ?? expirationPrice;
            var outcome = ResultVerifier.Verify(signal.Direction, entryPrice, expirationPrice);

            signal.Status = outcome;
            signal.ExpirationPrice = expirationPrice;

            db.SignalResults.Add(new SignalResult
            {
                SignalId = signal.Id,
                Outcome = outcome,
                EntryCandleId = null,
                ExpirationCandleId = expirationCandle.Id,
                EntryPrice = entryPrice,
                ExpirationPrice = expirationPrice,
                OriginalSignalTimestampUtc = signal.SignalCreatedAtUtc,
                EntryTimestampUtc = signal.EntryTimeUtc,
                ExpirationTimestampUtc = signal.ExpirationTimeUtc,
                ProviderTimestampUtc = expirationCandle.ProviderTimestampUtc,
                ServerTimestampUtc = now,
                VerificationTimestampUtc = now,
                VerificationMethod = VerificationMethod.Automatic,
                DataSourceIdentifier = expirationCandle.DataSource,
                IsLocked = true
            });

            await db.SaveChangesAsync(ct);
            await realtime.NotifySignalResultAsync(signal.Id, outcome, ct);
            await notifications.DispatchSignalNotificationAsync(signal.Id, NotificationType.SignalResult, ct);
        }
    }
}
