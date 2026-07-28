using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Models;
using FlexXSignal.SignalEngine.Strategies;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class StrategyDirectionTests
{
    /// <summary>Builds a "staircase" trend: repeating groups of 3 higher-close bullish candles
    /// followed by 1 small higher-low pullback candle, producing genuine swing structure while
    /// keeping EMA alignment and RSI solidly on the trending side.</summary>
    private static List<CandleData> BuildStaircaseUptrend(int groups = 20)
    {
        var candles = new List<CandleData>();
        var price = 1.0000m;
        var time = DateTime.UtcNow.AddMinutes(-groups * 4);

        for (var g = 0; g < groups; g++)
        {
            for (var i = 0; i < 3; i++)
            {
                var open = price;
                price += 0.0008m;
                var close = price;
                candles.Add(new CandleData { OpenTimeUtc = time, CloseTimeUtc = time.AddMinutes(1), Open = open, High = close + 0.00005m, Low = open - 0.00005m, Close = close, Volume = 150 });
                time = time.AddMinutes(1);
            }
            // Small pullback candle with a higher low than the start of this leg, except on the final
            // group: the series must end on fresh bullish momentum for a continuation strategy to trigger.
            // Sized to keep Wilder RSI in the 50-82 "not exhausted" band the strategy requires.
            if (g < groups - 1)
            {
                var pullbackOpen = price;
                price -= 0.0012m;
                candles.Add(new CandleData { OpenTimeUtc = time, CloseTimeUtc = time.AddMinutes(1), Open = pullbackOpen, High = pullbackOpen + 0.00005m, Low = price - 0.00005m, Close = price, Volume = 120 });
                time = time.AddMinutes(1);
            }
        }

        return candles;
    }

    private static List<CandleData> BuildStaircaseDowntrend(int groups = 20)
    {
        var up = BuildStaircaseUptrend(groups);
        // Mirror the uptrend around its starting price to get an equally clean downtrend.
        var basePrice = up[0].Open;
        return up.Select(c => new CandleData
        {
            OpenTimeUtc = c.OpenTimeUtc,
            CloseTimeUtc = c.CloseTimeUtc,
            Open = basePrice - (c.Open - basePrice),
            High = basePrice - (c.Low - basePrice),
            Low = basePrice - (c.High - basePrice),
            Close = basePrice - (c.Close - basePrice),
            Volume = c.Volume
        }).ToList();
    }

    [Fact]
    public void MomentumContinuationStrategy_UptrendingMarket_SignalsUp()
    {
        var strategy = new MomentumContinuationStrategy();
        var candles = BuildStaircaseUptrend();

        var context = new StrategyContext
        {
            PairSymbol = "EURUSD",
            MarketType = PairMarketType.Regular,
            ExecutionTimeframe = Timeframe.Minute1,
            ExecutionCandles = candles,
            EvaluationTimeUtc = DateTime.UtcNow,
            ProposedExpiration = ExpirationDuration.Minute1
        };

        var result = strategy.Evaluate(context);

        result.Direction.Should().Be(StrategyDirectionVote.Up);
        result.Reasons.Should().Contain(r => r.IsSupporting && r.Code == "EmaBullishAlignment");
    }

    [Fact]
    public void MomentumContinuationStrategy_DowntrendingMarket_SignalsDown()
    {
        var strategy = new MomentumContinuationStrategy();
        var candles = BuildStaircaseDowntrend();

        var context = new StrategyContext
        {
            PairSymbol = "EURUSD",
            MarketType = PairMarketType.Regular,
            ExecutionTimeframe = Timeframe.Minute1,
            ExecutionCandles = candles,
            EvaluationTimeUtc = DateTime.UtcNow,
            ProposedExpiration = ExpirationDuration.Minute1
        };

        var result = strategy.Evaluate(context);

        result.Direction.Should().Be(StrategyDirectionVote.Down);
    }

    [Fact]
    public void TrendPullbackStrategy_RespectsMinimumCandlesRequired()
    {
        var strategy = new TrendPullbackStrategy();
        var context = new StrategyContext
        {
            PairSymbol = "EURUSD",
            MarketType = PairMarketType.Regular,
            ExecutionTimeframe = Timeframe.Minute1,
            ExecutionCandles = BuildStaircaseUptrend(groups: 2), // far fewer than MinimumCandlesRequired
            EvaluationTimeUtc = DateTime.UtcNow,
            ProposedExpiration = ExpirationDuration.Minute1
        };

        var result = strategy.Evaluate(context);

        result.Direction.Should().Be(StrategyDirectionVote.None);
        result.Reasons.Should().Contain(r => r.Code == "InsufficientHistory");
    }

    [Fact]
    public void MultiTimeframeTrendConfirmationStrategy_RequiresHigherTimeframeAgreement()
    {
        var strategy = new MultiTimeframeTrendConfirmationStrategy();
        var uptrend = BuildStaircaseUptrend();
        var downtrendHtf = BuildStaircaseDowntrend();

        var context = new StrategyContext
        {
            PairSymbol = "EURUSD",
            MarketType = PairMarketType.Regular,
            ExecutionTimeframe = Timeframe.Minute1,
            ExecutionCandles = uptrend,
            HigherTimeframeCandles = downtrendHtf, // disagreeing higher timeframe
            EvaluationTimeUtc = DateTime.UtcNow,
            ProposedExpiration = ExpirationDuration.Minute1
        };

        var result = strategy.Evaluate(context);

        result.Direction.Should().Be(StrategyDirectionVote.None);
        result.Reasons.Should().Contain(r => r.Code == "TimeframeDisagreement");
    }
}
