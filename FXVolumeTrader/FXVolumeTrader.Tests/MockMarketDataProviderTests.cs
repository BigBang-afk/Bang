using FXVolumeTrader.Infrastructure.MarketData;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace FXVolumeTrader.Tests;

public class MockMarketDataProviderTests
{
    private static MockMarketDataProvider NewProvider(int tickIntervalMs = 10) => new(
        Options.Create(new MockMarketDataProviderOptions
        {
            TickIntervalMilliseconds = tickIntervalMs,
            BasePrice = 1.1000m,
            VolatilityPerTick = 0.0001m,
            TypicalSpread = 0.00006m
        }),
        NullLogger<MockMarketDataProvider>.Instance);

    [Fact]
    public async Task ConnectAsync_SetsIsConnectedTrue_DisconnectAsync_SetsItFalse()
    {
        var provider = NewProvider();

        Assert.False(provider.IsConnected);
        await provider.ConnectAsync(CancellationToken.None);
        Assert.True(provider.IsConnected);
        await provider.DisconnectAsync();
        Assert.False(provider.IsConnected);
    }

    [Fact]
    public async Task StreamTicksAsync_ProducesStrictlyIncreasingSequenceNumbers()
    {
        var provider = NewProvider();
        await provider.ConnectAsync(CancellationToken.None);

        using var cts = new CancellationTokenSource();
        var sequences = new List<long>();

        await foreach (var tick in provider.StreamTicksAsync("EURUSD", cts.Token))
        {
            sequences.Add(tick.SequenceNumber);
            Assert.Equal("EURUSD", tick.Symbol);
            Assert.Equal("Mock", tick.DataSource);
            Assert.True(tick.IsValid);

            if (sequences.Count >= 5)
            {
                cts.Cancel();
            }
        }

        Assert.Equal(new long[] { 1, 2, 3, 4, 5 }, sequences);
    }

    [Fact]
    public async Task StreamTicksAsync_StopsPromptly_WhenCancelled()
    {
        var provider = NewProvider(tickIntervalMs: 5000); // deliberately slow
        await provider.ConnectAsync(CancellationToken.None);

        using var cts = new CancellationTokenSource();
        cts.CancelAfter(TimeSpan.FromMilliseconds(50));

        var count = 0;
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            // The mock provider is mid-Task.Delay when the token cancels, so the
            // async iterator surfaces that as OperationCanceledException rather
            // than ending the sequence gracefully - both are valid cancellation
            // outcomes for a consumer to handle.
            await foreach (var _ in provider.StreamTicksAsync("EURUSD", cts.Token))
            {
                count++;
            }
        }
        catch (OperationCanceledException)
        {
        }
        stopwatch.Stop();

        Assert.Equal(0, count);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(2), "Cancellation should stop the stream well before the 5s tick interval elapses.");
    }
}
