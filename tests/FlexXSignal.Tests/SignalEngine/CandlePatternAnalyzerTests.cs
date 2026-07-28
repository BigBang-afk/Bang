using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Models;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class CandlePatternAnalyzerTests
{
    private static CandleData Candle(decimal open, decimal high, decimal low, decimal close) => new()
    {
        OpenTimeUtc = DateTime.UtcNow, CloseTimeUtc = DateTime.UtcNow.AddMinutes(1), Open = open, High = high, Low = low, Close = close, Volume = 100
    };

    [Fact]
    public void IsDoji_TrueWhenBodyNegligibleRelativeToRange()
    {
        var candle = Candle(1.1000m, 1.1050m, 1.0950m, 1.1002m);
        CandlePatternAnalyzer.IsDoji(candle).Should().BeTrue();
    }

    [Fact]
    public void IsBullishPinBar_TrueWithLongLowerWickAndSmallBody()
    {
        var candle = Candle(1.1030m, 1.1040m, 1.0950m, 1.1035m);
        CandlePatternAnalyzer.IsBullishPinBar(candle).Should().BeTrue();
    }

    [Fact]
    public void IsBullishEngulfing_DetectsReversalPattern()
    {
        var prev = Candle(1.1020m, 1.1025m, 1.0995m, 1.1000m); // bearish
        var curr = Candle(1.0998m, 1.1035m, 1.0995m, 1.1030m); // bullish, engulfs prev body
        CandlePatternAnalyzer.IsBullishEngulfing(prev, curr).Should().BeTrue();
    }

    [Fact]
    public void IsBearishEngulfing_DetectsReversalPattern()
    {
        var prev = Candle(1.1000m, 1.1030m, 1.0995m, 1.1025m); // bullish
        var curr = Candle(1.1027m, 1.1030m, 1.0990m, 1.0995m); // bearish, engulfs prev body
        CandlePatternAnalyzer.IsBearishEngulfing(prev, curr).Should().BeTrue();
    }

    [Fact]
    public void IsInsideBar_TrueWhenFullyContainedInPreviousRange()
    {
        var prev = Candle(1.1000m, 1.1050m, 1.0950m, 1.1010m);
        var curr = Candle(1.1010m, 1.1030m, 1.0970m, 1.1020m);
        CandlePatternAnalyzer.IsInsideBar(prev, curr).Should().BeTrue();
    }

    [Fact]
    public void ConsecutiveDirectionalCount_CountsRunOfSameDirectionCandles()
    {
        var candles = new List<CandleData>
        {
            Candle(1.10m, 1.11m, 1.09m, 1.105m),
            Candle(1.105m, 1.115m, 1.10m, 1.112m),
            Candle(1.112m, 1.122m, 1.108m, 1.120m),
        };

        CandlePatternAnalyzer.ConsecutiveDirectionalCount(candles).Should().Be(3);
    }

    [Fact]
    public void IsAbnormallyLarge_FlagsCandleFarBeyondRecentAverageRange()
    {
        var candles = new List<CandleData>();
        for (var i = 0; i < 20; i++) candles.Add(Candle(1.10m, 1.101m, 1.099m, 1.1005m));
        candles.Add(Candle(1.10m, 1.15m, 1.05m, 1.12m)); // huge range spike

        CandlePatternAnalyzer.IsAbnormallyLarge(candles, candles.Count - 1).Should().BeTrue();
    }
}
