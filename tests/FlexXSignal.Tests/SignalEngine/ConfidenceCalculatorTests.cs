using FlexXSignal.SignalEngine.Confidence;
using FlexXSignal.SignalEngine.Models;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class ConfidenceCalculatorTests
{
    [Fact]
    public void CalculateRawConfidence_AllComponentsMax_ReturnsHundred()
    {
        var scores = new ScoreBreakdown
        {
            TrendScore = 100, MarketStructureScore = 100, MomentumScore = 100, CandlePressureScore = 100,
            SupportResistanceScore = 100, BreakoutScore = 100, MultiTimeframeScore = 100, VolatilityScore = 100, HistoricalStrategyScore = 100
        };

        var confidence = ConfidenceCalculator.CalculateRawConfidence(scores, ConfidenceWeights.Default);

        confidence.Should().Be(100m);
    }

    [Fact]
    public void CalculateRawConfidence_AllComponentsZero_ReturnsZero()
    {
        var confidence = ConfidenceCalculator.CalculateRawConfidence(new ScoreBreakdown(), ConfidenceWeights.Default);
        confidence.Should().Be(0m);
    }

    [Fact]
    public void CalculateRawConfidence_IsDeterministic_NotRandom()
    {
        var scores = new ScoreBreakdown
        {
            TrendScore = 70, MarketStructureScore = 65, MomentumScore = 80, CandlePressureScore = 75,
            SupportResistanceScore = 60, BreakoutScore = 55, MultiTimeframeScore = 90, VolatilityScore = 85, HistoricalStrategyScore = 50
        };

        var first = ConfidenceCalculator.CalculateRawConfidence(scores, ConfidenceWeights.Default);
        var second = ConfidenceCalculator.CalculateRawConfidence(scores, ConfidenceWeights.Default);

        first.Should().Be(second);
    }

    [Theory]
    [InlineData(72, "70-74")]
    [InlineData(77, "75-79")]
    [InlineData(82, "80-84")]
    [InlineData(88, "85-89")]
    [InlineData(93, "90-94")]
    [InlineData(98, "95-100")]
    public void BandForConfidence_ReturnsCorrectBand(decimal confidence, string expectedBand)
    {
        ConfidenceCalculator.BandForConfidence(confidence).Should().Be(expectedBand);
    }

    [Fact]
    public void Calibrate_WithNoHistory_ReturnsRawConfidenceUnchanged()
    {
        var calibrated = ConfidenceCalculator.Calibrate(85m, null);
        calibrated.Should().Be(85m);
    }

    [Fact]
    public void Calibrate_PullsTowardObservedWinRate()
    {
        // Raw confidence says 90, but the strategy's actual recorded win rate for that band is only 60%.
        var calibrated = ConfidenceCalculator.Calibrate(90m, 60m, calibrationStrength: 0.25m);

        calibrated.Should().BeLessThan(90m);
        calibrated.Should().BeGreaterThan(60m);
    }
}
