using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Builds 5-minute and 15-minute candles by aggregating completed 1-minute candles, so
/// higher-timeframe strategy confirmation always has real, derived (not fabricated) data available.</summary>
public sealed class CandleAggregationService : TimedBackgroundService
{
    private static readonly Timeframe[] TargetTimeframes = { Timeframe.Minutes5, Timeframe.Minutes15 };
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(30);

    public CandleAggregationService(IServiceScopeFactory scopeFactory, ILogger<CandleAggregationService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pairs = await db.TradingPairs.AsNoTracking().Where(p => p.IsActive).ToListAsync(ct);

        foreach (var pair in pairs)
        {
            foreach (var target in TargetTimeframes)
            {
                await AggregateAsync(db, pair.Id, target, ct);
            }
        }
    }

    private static async Task AggregateAsync(AppDbContext db, Guid pairId, Timeframe target, CancellationToken ct)
    {
        var periodSeconds = (int)target;
        var lastAggregated = await db.Candles.AsNoTracking()
            .Where(c => c.TradingPairId == pairId && c.Timeframe == target)
            .OrderByDescending(c => c.OpenTimeUtc)
            .Select(c => (DateTime?)c.OpenTimeUtc)
            .FirstOrDefaultAsync(ct);

        var since = lastAggregated ?? DateTime.UtcNow.AddHours(-6);

        var sourceCandles = await db.Candles.AsNoTracking()
            .Where(c => c.TradingPairId == pairId && c.Timeframe == Timeframe.Minute1 && c.OpenTimeUtc >= since && c.IsClosed)
            .OrderBy(c => c.OpenTimeUtc)
            .ToListAsync(ct);

        if (sourceCandles.Count == 0) return;

        var buckets = sourceCandles.GroupBy(c => AlignToBucket(c.OpenTimeUtc, periodSeconds));
        var added = false;

        foreach (var bucket in buckets)
        {
            var bucketEnd = bucket.Key.AddSeconds(periodSeconds);
            // Only aggregate a bucket once every source minute within it has actually closed.
            if (DateTime.UtcNow < bucketEnd) continue;

            var exists = await db.Candles.AnyAsync(c => c.TradingPairId == pairId && c.Timeframe == target && c.OpenTimeUtc == bucket.Key, ct);
            if (exists) continue;

            var ordered = bucket.OrderBy(c => c.OpenTimeUtc).ToList();
            db.Candles.Add(new Candle
            {
                TradingPairId = pairId,
                Timeframe = target,
                OpenTimeUtc = bucket.Key,
                CloseTimeUtc = bucketEnd,
                Open = ordered.First().Open,
                High = ordered.Max(c => c.High),
                Low = ordered.Min(c => c.Low),
                Close = ordered.Last().Close,
                Volume = ordered.Sum(c => c.Volume),
                IsClosed = true,
                DataSource = "Aggregated",
                DataQuality = ordered.Any(c => c.DataQuality != DataQualityStatus.Good) ? DataQualityStatus.Delayed : DataQualityStatus.Good,
                ProviderTimestampUtc = ordered.Last().ProviderTimestampUtc
            });
            added = true;
        }

        if (added) await db.SaveChangesAsync(ct);
    }

    private static DateTime AlignToBucket(DateTime timeUtc, int periodSeconds)
    {
        var epochSeconds = (long)(timeUtc - DateTime.UnixEpoch).TotalSeconds;
        var bucketStartSeconds = epochSeconds - epochSeconds % periodSeconds;
        return DateTime.UnixEpoch.AddSeconds(bucketStartSeconds);
    }
}
