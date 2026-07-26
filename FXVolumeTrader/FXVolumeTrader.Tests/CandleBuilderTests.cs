using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.MarketData;
using FXVolumeTrader.Core.Models;
using Xunit;

namespace FXVolumeTrader.Tests;

public class CandleBuilderTests
{
    private static Tick NewTick(decimal price, DateTime timestampUtc, long seq) => new()
    {
        Symbol = "EURUSD",
        Bid = price - 0.0001m,
        Ask = price + 0.0001m,
        Last = price,
        TimestampUtc = timestampUtc,
        SequenceNumber = seq,
        DataSource = "Test"
    };

    [Fact]
    public void ApplyTick_KeepsSameOpenCandle_WithinOneTimeframeBoundary()
    {
        var builder = new CandleBuilder("EURUSD");
        var start = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        builder.ApplyTick(NewTick(1.1000m, start, 1));
        builder.ApplyTick(NewTick(1.1005m, start.AddSeconds(30), 2));

        var candle = builder.OpenCandles[TimeframeType.Minute1];
        Assert.Equal(1.1000m, candle.Open);
        Assert.Equal(1.1005m, candle.Close);
        Assert.False(candle.IsFinalized);
    }

    [Fact]
    public void ApplyTick_FinalizesPreviousCandle_WhenBoundaryIsCrossed()
    {
        var builder = new CandleBuilder("EURUSD");
        var start = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        Candle? closedCandle = null;
        builder.CandleClosed += (_, e) =>
        {
            if (e.Timeframe == TimeframeType.Minute1)
            {
                closedCandle = e.Candle;
            }
        };

        builder.ApplyTick(NewTick(1.1000m, start, 1));
        builder.ApplyTick(NewTick(1.1010m, start.AddSeconds(65), 2)); // crosses into the next minute

        Assert.NotNull(closedCandle);
        Assert.True(closedCandle!.IsFinalized);
        Assert.Equal(1.1000m, closedCandle.Close); // only ever saw the first tick

        var newOpenCandle = builder.OpenCandles[TimeframeType.Minute1];
        Assert.Equal(1.1010m, newOpenCandle.Open);
        Assert.False(newOpenCandle.IsFinalized);
    }

    [Fact]
    public void ApplyTick_BuildsAllSevenTimeframesSimultaneously()
    {
        var builder = new CandleBuilder("EURUSD");
        builder.ApplyTick(NewTick(1.1000m, new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc), 1));

        var expected = new[]
        {
            TimeframeType.Seconds5, TimeframeType.Seconds15, TimeframeType.Seconds30,
            TimeframeType.Minute1, TimeframeType.Minutes3, TimeframeType.Minutes5, TimeframeType.Minutes15
        };

        foreach (var timeframe in expected)
        {
            Assert.True(builder.OpenCandles.ContainsKey(timeframe));
        }
    }

    [Fact]
    public void ApplyTick_AlignsBoundaries_ToFixedEpochBuckets_NotFirstTickReceived()
    {
        var builder = new CandleBuilder("EURUSD");
        // 12:00:07 UTC should align to the 12:00:00-12:00:05 30s... actually
        // for Minute1 it should align to 12:00:00, not 12:00:07.
        var tickTime = new DateTime(2026, 1, 1, 12, 0, 7, DateTimeKind.Utc);
        builder.ApplyTick(NewTick(1.1000m, tickTime, 1));

        var candle = builder.OpenCandles[TimeframeType.Minute1];
        Assert.Equal(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc), candle.StartTimeUtc);

        var candle5s = builder.OpenCandles[TimeframeType.Seconds5];
        Assert.Equal(new DateTime(2026, 1, 1, 12, 0, 5, DateTimeKind.Utc), candle5s.StartTimeUtc);
    }
}
