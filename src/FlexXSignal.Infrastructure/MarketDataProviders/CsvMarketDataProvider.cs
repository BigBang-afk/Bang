using System.Collections.Concurrent;
using System.Globalization;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.MarketDataProviders;

/// <summary>
/// Imports historical candle files with columns: Timestamp, Open, High, Low, Close, Volume, Pair, Timeframe.
/// Used for backtesting and for seeding development history; never represents live data.
/// </summary>
public sealed class CsvMarketDataProvider : IMarketDataProvider
{
    private readonly ILogger<CsvMarketDataProvider> _logger;
    private readonly ConcurrentDictionary<string, List<ProviderCandle>> _importedCandles = new();
    private ProviderConnectionStatus _status = ProviderConnectionStatus.Disconnected;

    public string ProviderName => "CSV Historical Import";
    public MarketDataProviderType ProviderType => MarketDataProviderType.Csv;
    public ProviderConnectionStatus ConnectionStatus => _status;
    public bool IsDemoData => true;

    // Required by IMarketDataProvider; this provider is a passive historical importer and never
    // pushes live ticks or faults, so neither event is ever raised.
#pragma warning disable CS0067
    public event EventHandler<ProviderDataReceivedEventArgs>? DataReceived;
    public event EventHandler<ProviderDataErrorEventArgs>? DataError;
#pragma warning restore CS0067

    public CsvMarketDataProvider(ILogger<CsvMarketDataProvider> logger) => _logger = logger;

    public Task ConnectAsync(CancellationToken ct = default)
    {
        _status = ProviderConnectionStatus.Connected;
        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken ct = default)
    {
        _status = ProviderConnectionStatus.Disconnected;
        return Task.CompletedTask;
    }

    public Task SubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) => Task.CompletedTask;
    public Task UnsubscribeAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default) => Task.CompletedTask;

    public Task<IReadOnlyList<ProviderCandle>> GetHistoricalCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var key = BuildKey(pairSymbol, timeframe);
        if (!_importedCandles.TryGetValue(key, out var candles))
            return Task.FromResult<IReadOnlyList<ProviderCandle>>(Array.Empty<ProviderCandle>());

        var filtered = candles.Where(c => c.OpenTimeUtc >= fromUtc && c.OpenTimeUtc < toUtc).OrderBy(c => c.OpenTimeUtc).ToList();
        return Task.FromResult<IReadOnlyList<ProviderCandle>>(filtered);
    }

    public Task<ProviderCandle?> GetLatestCandleAsync(string pairSymbol, Timeframe timeframe, CancellationToken ct = default)
    {
        var key = BuildKey(pairSymbol, timeframe);
        var latest = _importedCandles.TryGetValue(key, out var candles) ? candles.OrderByDescending(c => c.OpenTimeUtc).FirstOrDefault() : null;
        return Task.FromResult(latest);
    }

    public ProviderConnectionStatus GetConnectionStatus() => _status;

    /// <summary>
    /// Parses a CSV file with header: Timestamp,Open,High,Low,Close,Volume,Pair,Timeframe.
    /// Timestamp must be ISO-8601 UTC. Timeframe is the period in seconds (15,30,60,300,900).
    /// Rows that fail to parse are skipped and reported back as warnings rather than aborting the import.
    /// </summary>
    public async Task<(int Imported, int Skipped, List<string> Warnings)> ImportAsync(Stream csvStream, CancellationToken ct = default)
    {
        using var reader = new StreamReader(csvStream);
        var headerLine = await reader.ReadLineAsync(ct);
        if (headerLine is null) return (0, 0, new List<string> { "File is empty." });

        var headers = headerLine.Split(',').Select(h => h.Trim()).ToList();
        var required = new[] { "Timestamp", "Open", "High", "Low", "Close", "Volume", "Pair", "Timeframe" };
        var missing = required.Except(headers, StringComparer.OrdinalIgnoreCase).ToList();
        if (missing.Count > 0) return (0, 0, new List<string> { $"Missing required columns: {string.Join(", ", missing)}" });

        var indexOf = headers.Select((h, i) => (h, i)).ToDictionary(x => x.h, x => x.i, StringComparer.OrdinalIgnoreCase);
        var imported = 0;
        var skipped = 0;
        var warnings = new List<string>();
        var lineNumber = 1;

        string? line;
        while ((line = await reader.ReadLineAsync(ct)) is not null)
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line)) continue;
            var parts = line.Split(',');

            try
            {
                var timestamp = DateTime.Parse(parts[indexOf["Timestamp"]], CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
                var open = decimal.Parse(parts[indexOf["Open"]], CultureInfo.InvariantCulture);
                var high = decimal.Parse(parts[indexOf["High"]], CultureInfo.InvariantCulture);
                var low = decimal.Parse(parts[indexOf["Low"]], CultureInfo.InvariantCulture);
                var close = decimal.Parse(parts[indexOf["Close"]], CultureInfo.InvariantCulture);
                var volume = decimal.Parse(parts[indexOf["Volume"]], CultureInfo.InvariantCulture);
                var pair = parts[indexOf["Pair"]].Trim();
                var periodSeconds = int.Parse(parts[indexOf["Timeframe"]], CultureInfo.InvariantCulture);
                var timeframe = (Timeframe)periodSeconds;

                if (high < Math.Max(open, close) || low > Math.Min(open, close))
                {
                    warnings.Add($"Line {lineNumber}: high/low inconsistent with open/close, skipped.");
                    skipped++;
                    continue;
                }

                var candle = new ProviderCandle
                {
                    PairSymbol = pair,
                    Timeframe = timeframe,
                    OpenTimeUtc = timestamp,
                    CloseTimeUtc = timestamp.AddSeconds(periodSeconds),
                    Open = open,
                    High = high,
                    Low = low,
                    Close = close,
                    Volume = volume,
                    IsClosed = true,
                    ProviderTimestampUtc = timestamp,
                    DataQuality = DataQualityStatus.Good
                };

                var key = BuildKey(pair, timeframe);
                _importedCandles.AddOrUpdate(key, _ => new List<ProviderCandle> { candle }, (_, list) => { list.Add(candle); return list; });
                imported++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse CSV line {LineNumber}", lineNumber);
                warnings.Add($"Line {lineNumber}: {ex.Message}");
                skipped++;
            }
        }

        return (imported, skipped, warnings);
    }

    private static string BuildKey(string pairSymbol, Timeframe timeframe) => $"{pairSymbol}|{(int)timeframe}";
}
