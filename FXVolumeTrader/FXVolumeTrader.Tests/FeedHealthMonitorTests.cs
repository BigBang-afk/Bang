using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.MarketData;
using FXVolumeTrader.Core.Models;
using Xunit;

namespace FXVolumeTrader.Tests;

public class FeedHealthMonitorTests
{
    private static Tick NewTick(decimal price, DateTime timestampUtc, long seq, string symbol = "EURUSD") => new()
    {
        Symbol = symbol,
        Bid = price - 0.0001m,
        Ask = price + 0.0001m,
        Last = price,
        TimestampUtc = timestampUtc,
        SequenceNumber = seq,
        DataSource = "Test"
    };

    [Fact]
    public void Evaluate_ReportsNoAnomalies_ForHealthySequentialTicks()
    {
        var monitor = new FeedHealthMonitor();
        var now = DateTime.UtcNow;

        var first = monitor.Evaluate(NewTick(1.1000m, now, 1));
        var second = monitor.Evaluate(NewTick(1.1001m, now.AddMilliseconds(200), 2));

        Assert.Empty(first);
        Assert.Empty(second);
        Assert.Equal(ConnectionStatus.Connected, monitor.Status);
    }

    [Fact]
    public void Evaluate_DetectsDuplicateSequenceNumber()
    {
        var monitor = new FeedHealthMonitor();
        var now = DateTime.UtcNow;
        monitor.Evaluate(NewTick(1.1000m, now, 5));

        var anomalies = monitor.Evaluate(NewTick(1.1000m, now, 5));

        Assert.Contains(anomalies, a => a.Type == TickAnomalyType.DuplicateTick);
    }

    [Fact]
    public void Evaluate_DetectsOutOfOrderSequenceNumber()
    {
        var monitor = new FeedHealthMonitor();
        var now = DateTime.UtcNow;
        monitor.Evaluate(NewTick(1.1000m, now, 10));

        var anomalies = monitor.Evaluate(NewTick(1.1000m, now, 3));

        Assert.Contains(anomalies, a => a.Type == TickAnomalyType.OutOfOrderTick);
    }

    [Fact]
    public void Evaluate_DetectsInvalidPrice()
    {
        var monitor = new FeedHealthMonitor();
        var anomalies = monitor.Evaluate(new Tick
        {
            Symbol = "EURUSD",
            Bid = 1.1005m,
            Ask = 1.1000m, // ask below bid - invalid
            Last = 1.1002m,
            TimestampUtc = DateTime.UtcNow,
            SequenceNumber = 1,
            DataSource = "Test"
        });

        Assert.Contains(anomalies, a => a.Type == TickAnomalyType.InvalidPrice);
    }

    [Fact]
    public void Evaluate_DetectsLargePriceGap()
    {
        var options = new FeedHealthMonitorOptions { MaxPriceGapPercentage = 1.0m };
        var monitor = new FeedHealthMonitor(options);
        var now = DateTime.UtcNow;
        monitor.Evaluate(NewTick(1.1000m, now, 1));

        var anomalies = monitor.Evaluate(NewTick(1.2500m, now.AddMilliseconds(200), 2)); // ~13.6% jump

        Assert.Contains(anomalies, a => a.Type == TickAnomalyType.LargePriceGap);
    }

    [Fact]
    public void Evaluate_DetectsDelayedFeed_AndSetsStatusToDelayed()
    {
        var options = new FeedHealthMonitorOptions { MaxFeedDelaySeconds = 5 };
        var monitor = new FeedHealthMonitor(options);

        var anomalies = monitor.Evaluate(NewTick(1.1000m, DateTime.UtcNow.AddSeconds(-30), 1));

        Assert.Contains(anomalies, a => a.Type == TickAnomalyType.DelayedFeed);
        Assert.Equal(ConnectionStatus.Delayed, monitor.Status);
    }

    [Fact]
    public void MarkDisconnected_ResetsStatusAndSequenceTracking()
    {
        var monitor = new FeedHealthMonitor();
        monitor.Evaluate(NewTick(1.1000m, DateTime.UtcNow, 5));

        monitor.MarkDisconnected();

        Assert.Equal(ConnectionStatus.Disconnected, monitor.Status);

        // Sequence tracking reset - a lower sequence number after reconnect is not flagged as out-of-order.
        var anomalies = monitor.Evaluate(NewTick(1.1000m, DateTime.UtcNow, 1));
        Assert.DoesNotContain(anomalies, a => a.Type == TickAnomalyType.OutOfOrderTick);
    }
}
