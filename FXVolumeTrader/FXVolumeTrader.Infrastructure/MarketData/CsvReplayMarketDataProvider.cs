using System.Globalization;
using System.Runtime.CompilerServices;
using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FXVolumeTrader.Infrastructure.MarketData;

/// <summary>
/// Replays previously captured tick data from a local CSV file. Used for
/// Replay Mode and as a historical data source for backtesting. Reads only
/// from the file the user points it at - never a live or scraped feed.
/// </summary>
public sealed class CsvReplayMarketDataProvider : IMarketDataProvider
{
    private readonly CsvReplayMarketDataProviderOptions _options;
    private readonly ILogger<CsvReplayMarketDataProvider> _logger;

    public CsvReplayMarketDataProvider(IOptions<CsvReplayMarketDataProviderOptions> options, ILogger<CsvReplayMarketDataProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConnected { get; private set; }

    public Task ConnectAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.FilePath) || !File.Exists(_options.FilePath))
        {
            throw new FileNotFoundException(
                "CSV replay file was not found. Configure MarketData:CsvReplay:FilePath in appsettings.json.",
                _options.FilePath);
        }

        IsConnected = true;
        _logger.LogInformation("CsvReplayMarketDataProvider connected to {FilePath}.", _options.FilePath);
        return Task.CompletedTask;
    }

    public Task DisconnectAsync()
    {
        IsConnected = false;
        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<Tick> StreamTicksAsync(
        string symbol,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(_options.FilePath);
        _ = await reader.ReadLineAsync(cancellationToken); // header row

        DateTime? previousTimestamp = null;
        long sequence = 0;
        long skippedRows = 0;

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            Tick tick;
            try
            {
                tick = ParseLine(line, symbol, ++sequence);
            }
            catch (Exception ex)
            {
                skippedRows++;
                _logger.LogWarning(ex, "Skipping malformed CSV replay row {RowNumber}: {Line}", sequence, line);
                continue;
            }

            if (_options.RealTimePlayback && previousTimestamp is not null)
            {
                var delta = tick.TimestampUtc - previousTimestamp.Value;
                if (delta > TimeSpan.Zero)
                {
                    var scaled = delta / _options.PlaybackSpeedMultiplier;
                    var capped = scaled > _options.MaxDelayBetweenTicks ? _options.MaxDelayBetweenTicks : scaled;
                    await Task.Delay(capped, cancellationToken);
                }
            }

            previousTimestamp = tick.TimestampUtc;
            yield return tick;
        }

        if (skippedRows > 0)
        {
            _logger.LogWarning("CSV replay of {FilePath} finished with {SkippedRows} skipped row(s).", _options.FilePath, skippedRows);
        }
    }

    private static Tick ParseLine(string line, string symbol, long fallbackSequence)
    {
        var parts = line.Split(',');
        if (parts.Length < 4)
        {
            throw new FormatException("Expected at least 4 columns: Bid,Ask,Last,TimestampUtc[,SequenceNumber].");
        }

        var bid = decimal.Parse(parts[0], CultureInfo.InvariantCulture);
        var ask = decimal.Parse(parts[1], CultureInfo.InvariantCulture);
        var last = decimal.Parse(parts[2], CultureInfo.InvariantCulture);
        var timestamp = DateTime.Parse(
            parts[3],
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
        var sequence = parts.Length >= 5 && long.TryParse(parts[4], out var parsedSequence)
            ? parsedSequence
            : fallbackSequence;

        return new Tick
        {
            Symbol = symbol,
            Bid = bid,
            Ask = ask,
            Last = last,
            TimestampUtc = timestamp,
            SequenceNumber = sequence,
            DataSource = "CsvReplay"
        };
    }
}
