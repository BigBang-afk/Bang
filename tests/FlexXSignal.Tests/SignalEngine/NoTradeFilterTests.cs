using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Filters;
using FlexXSignal.SignalEngine.Models;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class NoTradeFilterTests
{
    private static StrategyContext BaseContext(DataQualityStatus quality = DataQualityStatus.Good) => new()
    {
        PairSymbol = "EURUSD",
        MarketType = PairMarketType.Regular,
        ExecutionTimeframe = Timeframe.Minute1,
        ExecutionCandles = Array.Empty<CandleData>(),
        EvaluationTimeUtc = DateTime.UtcNow,
        ProposedExpiration = ExpirationDuration.Minute1,
        DataQuality = quality
    };

    private static StrategyResult BaseResult(StrategyDirectionVote direction = StrategyDirectionVote.Up, decimal confidence = 90, MarketCondition condition = MarketCondition.Trending) => new()
    {
        StrategyKey = "test",
        StrategyVersion = 1,
        Direction = direction,
        Confidence = confidence,
        MarketCondition = condition,
        Scores = new ScoreBreakdown { VolatilityScore = 80 }
    };

    private static NoTradeEnvironment HealthyEnvironment() => new()
    {
        StrategyEnabled = true,
        ProviderConnected = true,
        SignalsPublishedThisHour = 0,
        MaxSignalsPerHour = 10,
        DailyRealizedLossPercent = 0,
        DailyLossLimitPercent = 100,
        TimeUntilEntry = TimeSpan.FromMinutes(1),
        MinimumTimeBeforeEntry = TimeSpan.FromSeconds(5),
        RequiresHigherTimeframeData = false,
        HasHigherTimeframeData = true
    };

    [Fact]
    public void Pipeline_AllHealthy_Publishes()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        pipeline.CanPublish(BaseContext(), BaseResult(), HealthyEnvironment()).Should().BeTrue();
    }

    [Fact]
    public void Pipeline_BelowConfidenceThreshold_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(confidence: 65), HealthyEnvironment());
        blocked.Should().Contain(b => b.Code == "BelowConfidenceThreshold");
    }

    [Fact]
    public void Pipeline_ProviderDisconnected_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { ProviderConnected = false };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "ProviderDisconnected");
    }

    [Fact]
    public void Pipeline_StrategyDisabled_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { StrategyEnabled = false };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "StrategyDisabled");
    }

    [Fact]
    public void Pipeline_MaxSignalsPerHourReached_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { SignalsPublishedThisHour = 10, MaxSignalsPerHour = 10 };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "MaxSignalsPerHourReached");
    }

    [Fact]
    public void Pipeline_DailyLossLimitReached_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { DailyRealizedLossPercent = 60, DailyLossLimitPercent = 50 };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "DailyLossLimitReached");
    }

    [Fact]
    public void Pipeline_EntryTooClose_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { TimeUntilEntry = TimeSpan.FromSeconds(1), MinimumTimeBeforeEntry = TimeSpan.FromSeconds(5) };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "EntryTimingInvalid");
    }

    [Fact]
    public void Pipeline_DelayedData_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var blocked = pipeline.EvaluateAll(BaseContext(DataQualityStatus.Delayed), BaseResult(), HealthyEnvironment());
        blocked.Should().Contain(b => b.Code == "DelayedData");
    }

    [Fact]
    public void Pipeline_NoDirection_Blocks()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(direction: StrategyDirectionVote.None), HealthyEnvironment());
        blocked.Should().Contain(b => b.Code == "NoDirection");
    }

    [Fact]
    public void Pipeline_MissingHigherTimeframeData_BlocksWhenRequired()
    {
        var pipeline = new NoTradeFilterPipeline(minimumConfidence: 80);
        var env = HealthyEnvironment() with { RequiresHigherTimeframeData = true, HasHigherTimeframeData = false };
        var blocked = pipeline.EvaluateAll(BaseContext(), BaseResult(), env);
        blocked.Should().Contain(b => b.Code == "MissingHigherTimeframeData");
    }
}
