using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Services;
using FlexXSignal.SignalEngine.Engine;
using FlexXSignal.SignalEngine.Strategies;
using FlexXSignal.Tests.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FlexXSignal.Tests.Backtesting;

/// <summary>
/// Proves the backtesting engine cannot see into the future: two datasets that are byte-for-byte
/// identical up to a divergence point, then diverge into opposite trends, must produce identical
/// backtest decisions for every trade whose entry AND expiration candle fall before the divergence.
/// If the engine were leaking future data, changing the post-divergence candles would change earlier
/// decisions too.
/// </summary>
public class BacktestNoLookAheadTests
{
    private const int DivergenceIndex = 200;

    [Fact]
    public async Task RunQueuedBacktestAsync_TradesBeforeDivergencePoint_AreIdenticalRegardlessOfFutureData()
    {
        var sharedPrefix = BuildStaircase(DivergenceIndex, upward: true);
        var continuationUp = BuildStaircase(80, upward: true, startPrice: sharedPrefix[^1].Close);
        var continuationDown = BuildStaircase(80, upward: false, startPrice: sharedPrefix[^1].Close);

        var seriesA = Concat(sharedPrefix, continuationUp);
        var seriesB = Concat(sharedPrefix, continuationDown);

        var tradesA = await RunBacktestAsync(seriesA, "pair-a");
        var tradesB = await RunBacktestAsync(seriesB, "pair-b");

        var divergenceTimeUtc = sharedPrefix[^1].CloseTimeUtc;

        var comparableA = tradesA.Where(t => t.ExpirationTimeUtc <= divergenceTimeUtc).OrderBy(t => t.EntryTimeUtc).ToList();
        var comparableB = tradesB.Where(t => t.ExpirationTimeUtc <= divergenceTimeUtc).OrderBy(t => t.EntryTimeUtc).ToList();

        comparableA.Should().NotBeEmpty("the shared uptrend prefix should produce at least one decision to compare");
        comparableA.Should().HaveSameCount(comparableB);

        for (var i = 0; i < comparableA.Count; i++)
        {
            comparableA[i].EntryTimeUtc.Should().Be(comparableB[i].EntryTimeUtc);
            comparableA[i].Direction.Should().Be(comparableB[i].Direction, "the decision must not depend on candles that had not happened yet");
            comparableA[i].ConfidencePercent.Should().Be(comparableB[i].ConfidencePercent);
            comparableA[i].Outcome.Should().Be(comparableB[i].Outcome);
        }
    }

    private static async Task<List<BacktestTrade>> RunBacktestAsync(List<CandleRow> candles, string pairSymbol)
    {
        var provider = TestServiceProviderFactory.Create();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        var pair = new TradingPair { Symbol = pairSymbol, DisplayName = pairSymbol, MarketType = PairMarketType.Regular, IsActive = true, ProviderSymbolMapping = pairSymbol };
        db.TradingPairs.Add(pair);

        var strategy = new Strategy { Key = "momentum-continuation", Name = "Momentum Continuation", Status = StrategyStatus.Enabled, MaxSignalsPerHour = 999, DailyLossLimitPercent = 100 };
        var version = new StrategyVersion { Strategy = strategy, VersionNumber = 1, IsActive = true, MinimumPublishConfidence = 0 };
        strategy.Versions.Add(version);
        db.Strategies.Add(strategy);

        foreach (var c in candles)
        {
            db.Candles.Add(new Candle
            {
                TradingPairId = pair.Id, Timeframe = Timeframe.Minute1, OpenTimeUtc = c.OpenTimeUtc, CloseTimeUtc = c.CloseTimeUtc,
                Open = c.Open, High = c.High, Low = c.Low, Close = c.Close, Volume = 100, IsClosed = true, DataSource = "Test"
            });
        }
        await db.SaveChangesAsync();

        var orchestrator = new SignalEngineOrchestrator(new ITradingStrategy[] { new MomentumContinuationStrategy() });
        var csvProvider = new CsvMarketDataProvider(NullLogger<CsvMarketDataProvider>.Instance);
        var clock = scope.ServiceProvider.GetRequiredService<Application.Common.Interfaces.IDateTimeProvider>();
        var backtestService = new BacktestService(db, clock, orchestrator, csvProvider);

        var backtest = new Backtest
        {
            Name = "No-lookahead test",
            TradingPairId = pair.Id,
            Timeframe = Timeframe.Minute1,
            StrategyVersionId = version.Id,
            Duration = ExpirationDuration.Minute1,
            InSampleStartUtc = candles.First().OpenTimeUtc,
            InSampleEndUtc = candles.Last().CloseTimeUtc,
            ConfidenceThresholdOverride = 0,
            Status = BacktestStatus.Queued
        };
        db.Backtests.Add(backtest);
        await db.SaveChangesAsync();

        await backtestService.RunQueuedBacktestAsync(backtest.Id);

        return await db.BacktestTrades.Where(t => t.BacktestId == backtest.Id).ToListAsync();
    }

    private sealed record CandleRow(DateTime OpenTimeUtc, DateTime CloseTimeUtc, decimal Open, decimal High, decimal Low, decimal Close);

    private static List<CandleRow> BuildStaircase(int candleCount, bool upward, decimal startPrice = 1.0000m)
    {
        // A mild trend drift plus dominant independent noise: enough directional bias that EMA9/21/50
        // stay ordered and RSI drifts moderately away from 50, but with real up/down mixture so RSI
        // never pins near the strategy's exhaustion cutoffs and returns-based volatility stays healthy.
        // Deterministic (fixed) seed keeps the two comparison runs reproducible.
        var random = new Random(upward ? 12345 : 54321);
        var rows = new List<CandleRow>();
        var price = startPrice;
        decimal? prevClose = null;
        var time = DateTime.UtcNow.Date;
        var drift = upward ? 0.00022m : -0.00022m;

        for (var i = 0; i < candleCount; i++)
        {
            price += drift + ((decimal)random.NextDouble() - 0.5m) * 0.0028m;
            var open = prevClose ?? price - 0.0003m;
            var wick = 0.0001m + (decimal)random.NextDouble() * 0.0002m;
            rows.Add(new CandleRow(time, time.AddMinutes(1), open, Math.Max(open, price) + wick, Math.Min(open, price) - wick, price));
            prevClose = price;
            time = time.AddMinutes(1);
        }

        return rows;
    }

    private static List<CandleRow> Concat(List<CandleRow> prefix, List<CandleRow> suffix)
    {
        var result = new List<CandleRow>(prefix);
        var lastTime = prefix[^1].CloseTimeUtc;
        foreach (var row in suffix)
        {
            var offset = row.OpenTimeUtc - suffix[0].OpenTimeUtc;
            result.Add(row with { OpenTimeUtc = lastTime + offset, CloseTimeUtc = lastTime + offset + TimeSpan.FromMinutes(1) });
        }
        return result;
    }
}
