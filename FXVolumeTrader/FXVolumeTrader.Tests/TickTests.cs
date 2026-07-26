using FXVolumeTrader.Core.Models;
using Xunit;

namespace FXVolumeTrader.Tests;

public class TickTests
{
    [Fact]
    public void IsValid_ReturnsFalse_WhenAskIsBelowBid()
    {
        var tick = new Tick
        {
            Symbol = "EURUSD",
            Bid = 1.1005m,
            Ask = 1.1000m,
            Last = 1.1002m,
            TimestampUtc = DateTime.UtcNow,
            SequenceNumber = 1,
            DataSource = "Test"
        };

        Assert.False(tick.IsValid);
    }

    [Fact]
    public void IsValid_ReturnsTrue_ForWellFormedTick()
    {
        var tick = new Tick
        {
            Symbol = "EURUSD",
            Bid = 1.1000m,
            Ask = 1.1002m,
            Last = 1.1001m,
            TimestampUtc = DateTime.UtcNow,
            SequenceNumber = 1,
            DataSource = "Test"
        };

        Assert.True(tick.IsValid);
        Assert.Equal(0.0002m, tick.Spread);
    }
}
