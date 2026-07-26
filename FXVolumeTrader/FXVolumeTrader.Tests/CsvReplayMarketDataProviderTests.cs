using FXVolumeTrader.Infrastructure.MarketData;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace FXVolumeTrader.Tests;

public class CsvReplayMarketDataProviderTests
{
    private static CsvReplayMarketDataProvider NewProvider(string filePath, bool realTime = false) => new(
        Options.Create(new CsvReplayMarketDataProviderOptions
        {
            FilePath = filePath,
            RealTimePlayback = realTime
        }),
        NullLogger<CsvReplayMarketDataProvider>.Instance);

    [Fact]
    public async Task ConnectAsync_Throws_WhenFileDoesNotExist()
    {
        var provider = NewProvider("/nonexistent/path/ticks.csv");

        await Assert.ThrowsAsync<FileNotFoundException>(() => provider.ConnectAsync(CancellationToken.None));
    }

    [Fact]
    public async Task StreamTicksAsync_ParsesValidRows_AndSkipsMalformedOnes()
    {
        var path = Path.GetTempFileName();
        try
        {
            await File.WriteAllLinesAsync(path, new[]
            {
                "Bid,Ask,Last,TimestampUtc",
                "1.10000,1.10010,1.10005,2026-01-01T12:00:00Z",
                "not,a,valid,row",
                "1.10010,1.10020,1.10015,2026-01-01T12:00:01Z"
            });

            var provider = NewProvider(path);
            await provider.ConnectAsync(CancellationToken.None);

            var ticks = new List<Core.Models.Tick>();
            await foreach (var tick in provider.StreamTicksAsync("EURUSD", CancellationToken.None))
            {
                ticks.Add(tick);
            }

            Assert.Equal(2, ticks.Count);
            Assert.All(ticks, t => Assert.Equal("EURUSD", t.Symbol));
            Assert.All(ticks, t => Assert.Equal("CsvReplay", t.DataSource));
            Assert.Equal(1.10005m, ticks[0].Last);
            Assert.Equal(1.10015m, ticks[1].Last);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
