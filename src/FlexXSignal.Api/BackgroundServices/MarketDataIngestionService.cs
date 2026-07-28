using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Pulls the latest candle for every active trading pair on the 1-minute timeframe from
/// whichever provider is currently configured as active, and persists it. This is the single
/// ingestion point all other background services build on.</summary>
public sealed class MarketDataIngestionService : TimedBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    protected override TimeSpan Interval => TimeSpan.FromSeconds(15);

    public MarketDataIngestionService(IServiceScopeFactory scopeFactory, ILogger<MarketDataIngestionService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<IMarketDataProviderResolver>();
        var realtime = scope.ServiceProvider.GetRequiredService<ISignalRealtimeNotifier>();

        var provider = await resolver.GetActiveProviderAsync(ct);
        if (provider.GetConnectionStatus() != ProviderConnectionStatus.Connected)
        {
            await provider.ConnectAsync(ct);
        }

        var pairs = await db.TradingPairs.AsNoTracking().Where(p => p.IsActive).ToListAsync(ct);

        foreach (var pair in pairs)
        {
            try
            {
                var candle = await provider.GetLatestCandleAsync(pair.ProviderSymbolMapping, Timeframe.Minute1, ct);
                if (candle is null) continue;

                var exists = await db.Candles.AnyAsync(c => c.TradingPairId == pair.Id && c.Timeframe == Timeframe.Minute1 && c.OpenTimeUtc == candle.OpenTimeUtc, ct);
                if (!exists)
                {
                    db.Candles.Add(new Candle
                    {
                        TradingPairId = pair.Id,
                        Timeframe = Timeframe.Minute1,
                        OpenTimeUtc = candle.OpenTimeUtc,
                        CloseTimeUtc = candle.CloseTimeUtc,
                        Open = candle.Open,
                        High = candle.High,
                        Low = candle.Low,
                        Close = candle.Close,
                        Volume = candle.Volume,
                        IsClosed = candle.IsClosed,
                        DataSource = provider.ProviderName,
                        DataQuality = candle.DataQuality,
                        ProviderTimestampUtc = candle.ProviderTimestampUtc
                    });
                    await db.SaveChangesAsync(ct);
                    await realtime.NotifyCandleUpdateAsync(pair.Id, new
                    {
                        candle.OpenTimeUtc, candle.Open, candle.High, candle.Low, candle.Close, candle.Volume, IsDemoData = provider.IsDemoData
                    }, ct);
                }

                // Live payout tracking: some providers report payout alongside price data; the demo/CSV
                // providers do not, so this only changes when an authorized provider populates it.
            }
            catch (Exception ex)
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<MarketDataIngestionService>>();
                logger.LogWarning(ex, "Failed to ingest candle for {Pair}.", pair.Symbol);
            }
        }
    }
}
