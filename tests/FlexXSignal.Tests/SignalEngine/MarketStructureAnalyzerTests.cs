using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Models;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class MarketStructureAnalyzerTests
{
    private static CandleData C(decimal open, decimal high, decimal low, decimal close, int minutesAgo) => new()
    {
        OpenTimeUtc = DateTime.UtcNow.AddMinutes(-minutesAgo),
        CloseTimeUtc = DateTime.UtcNow.AddMinutes(-minutesAgo + 1),
        Open = open, High = high, Low = low, Close = close, Volume = 100
    };

    [Fact]
    public void FindSwingPoints_DetectsClearLocalHigh()
    {
        // A single obvious peak at index 4, flanked by two lower bars on each side.
        var highs = new decimal[] { 1.10m, 1.12m, 1.13m, 1.14m, 1.20m, 1.14m, 1.13m, 1.12m, 1.10m };
        var candles = highs.Select((h, i) => C(h - 0.005m, h, h - 0.01m, h - 0.002m, highs.Length - i)).ToList();

        var swings = MarketStructureAnalyzer.FindSwingPoints(candles, window: 2);

        swings.Should().Contain(s => s.IsHigh && s.Index == 4);
    }

    [Fact]
    public void FindZones_ClustersRepeatedTouchesIntoAZone()
    {
        // Three swing highs touching approximately the same resistance level (1.2000), separated by dips.
        var pattern = new decimal[] { 1.15m, 1.18m, 1.20m, 1.18m, 1.15m, 1.18m, 1.20m, 1.18m, 1.15m, 1.18m, 1.20m, 1.18m, 1.15m };
        var candles = pattern.Select((p, i) => C(p - 0.002m, p, p - 0.01m, p - 0.001m, pattern.Length - i)).ToList();

        var zones = MarketStructureAnalyzer.FindZones(candles, tolerancePercent: 0.01m);

        zones.Should().Contain(z => z.IsResistance && Math.Abs(z.Level - 1.20m) < 0.01m && z.TouchCount >= 2);
    }

    [Fact]
    public void IsLiquiditySweep_TrueWhenWickPiercesPriorLowButClosesBackInside()
    {
        var candles = new List<CandleData>();
        for (var i = 25; i >= 1; i--) candles.Add(C(1.10m, 1.102m, 1.098m, 1.10m, i)); // flat range, prior low ~1.098
        // Final candle sweeps below the prior low with its wick, then closes back above it.
        candles.Add(C(1.099m, 1.101m, 1.090m, 1.100m, 0));

        MarketStructureAnalyzer.IsLiquiditySweep(candles, sweepHigh: false).Should().BeTrue();
    }

    [Fact]
    public void IsLiquiditySweep_FalseWhenCandleClosesBeyondThePriorLow()
    {
        var candles = new List<CandleData>();
        for (var i = 25; i >= 1; i--) candles.Add(C(1.10m, 1.102m, 1.098m, 1.10m, i));
        // Breaks and stays below — a genuine breakdown, not a sweep-and-reject.
        candles.Add(C(1.099m, 1.100m, 1.090m, 1.091m, 0));

        MarketStructureAnalyzer.IsLiquiditySweep(candles, sweepHigh: false).Should().BeFalse();
    }

    [Fact]
    public void HasEqualLevels_DetectsTwoSwingHighsWithinTolerance()
    {
        var pattern = new decimal[] { 1.15m, 1.18m, 1.2001m, 1.18m, 1.15m, 1.18m, 1.2003m, 1.18m, 1.15m };
        var candles = pattern.Select((p, i) => C(p - 0.002m, p, p - 0.01m, p - 0.001m, pattern.Length - i)).ToList();

        MarketStructureAnalyzer.HasEqualLevels(candles, highs: true, tolerancePercent: 0.01m).Should().BeTrue();
    }

    [Fact]
    public void DetermineMarketCondition_FlagsQuietWhenVolatilityCollapses()
    {
        var candles = new List<CandleData>();
        for (var i = 40; i >= 1; i--) candles.Add(C(1.10m, 1.1001m, 1.0999m, 1.10m, i));

        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength: 20, volatility: 0.00005m, avgVolatility: 0.001m);

        condition.Should().Be(Domain.Enums.MarketCondition.Quiet);
    }
}
