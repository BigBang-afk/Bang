using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Models;
using Xunit;

namespace FXVolumeTrader.Tests;

public class CandleTests
{
    private static Candle NewCandle(DateTime start) => new()
    {
        Symbol = "EURUSD",
        Timeframe = TimeframeType.Minute1,
        StartTimeUtc = start,
        EndTimeUtc = start.AddMinutes(1)
    };

    private static Tick NewTick(string symbol, decimal price, DateTime timestamp, long seq, TickDirection direction = TickDirection.Neutral) => new()
    {
        Symbol = symbol,
        Bid = price - 0.0001m,
        Ask = price + 0.0001m,
        Last = price,
        TimestampUtc = timestamp,
        SequenceNumber = seq,
        DataSource = "Test",
        Direction = direction
    };

    [Fact]
    public void ApplyTick_SetsOpenOnFirstTickOnly()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);

        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1));
        candle.ApplyTick(NewTick("EURUSD", 1.1010m, start.AddSeconds(1), 2));

        Assert.Equal(1.1000m, candle.Open);
        Assert.Equal(1.1010m, candle.Close);
    }

    [Fact]
    public void Finalize_PreventsFurtherMutation()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1));
        candle.MarkFinalized();

        candle.ApplyTick(NewTick("EURUSD", 1.5000m, start.AddSeconds(1), 2));

        Assert.True(candle.IsFinalized);
        Assert.Equal(1.1000m, candle.Close);
    }

    [Fact]
    public void BodyPercentage_IsZero_ForZeroRangeCandle()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1));
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start.AddSeconds(1), 2));
        candle.MarkFinalized();

        Assert.Equal(0m, candle.Range);
        Assert.Equal(0m, candle.BodyPercentage);
        Assert.Equal(0m, candle.UpperWickPercentage);
        Assert.Equal(0m, candle.LowerWickPercentage);
    }

    [Fact]
    public void ClosePosition_IsOne_WhenCloseEqualsHigh()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1));
        candle.ApplyTick(NewTick("EURUSD", 1.0990m, start.AddSeconds(1), 2));
        candle.ApplyTick(NewTick("EURUSD", 1.1020m, start.AddSeconds(2), 3));
        candle.MarkFinalized();

        Assert.Equal(1m, candle.ClosePosition);
        Assert.True(candle.IsBullish);
    }

    [Fact]
    public void BullishTickRatio_ComputesFromDirectionalTicksOnly()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1, TickDirection.Up));
        candle.ApplyTick(NewTick("EURUSD", 1.1001m, start.AddSeconds(1), 2, TickDirection.Up));
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start.AddSeconds(2), 3, TickDirection.Down));
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start.AddSeconds(3), 4, TickDirection.Neutral));
        candle.MarkFinalized();

        Assert.Equal(2m / 3m, candle.BullishTickRatio);
        Assert.Equal(1m / 3m, candle.BearishTickRatio);
    }

    [Fact]
    public void RelativeVolume_ReturnsZero_WhenAverageIsZeroOrNegative()
    {
        var start = DateTime.UtcNow;
        var candle = NewCandle(start);
        candle.ApplyTick(NewTick("EURUSD", 1.1000m, start, 1));

        Assert.Equal(0m, candle.RelativeVolume(0m));
        Assert.Equal(0m, candle.RelativeVolume(-5m));
    }
}
