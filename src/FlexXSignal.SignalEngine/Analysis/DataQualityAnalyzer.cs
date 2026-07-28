using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Analysis;

public static class DataQualityAnalyzer
{
    /// <summary>Detects gaps in the candle series larger than one expected period, meaning candles are missing.</summary>
    public static bool HasMissingCandles(IReadOnlyList<CandleData> candles, TimeSpan expectedPeriod, decimal toleranceRatio = 1.5m)
    {
        for (var i = 1; i < candles.Count; i++)
        {
            var gap = candles[i].OpenTimeUtc - candles[i - 1].CloseTimeUtc;
            if (gap > TimeSpan.FromTicks((long)(expectedPeriod.Ticks * toleranceRatio))) return true;
        }
        return false;
    }

    /// <summary>Detects whether the most recent candle timestamp is stale relative to now, meaning the feed is delayed.</summary>
    public static bool IsDelayed(IReadOnlyList<CandleData> candles, DateTime nowUtc, TimeSpan maxAllowedDelay)
    {
        if (candles.Count == 0) return true;
        return nowUtc - candles[^1].CloseTimeUtc > maxAllowedDelay;
    }

    public static bool HasSufficientHistory(IReadOnlyList<CandleData> candles, int minimumCandles) => candles.Count >= minimumCandles;

    /// <summary>0-100 score summarizing overall data quality for the confidence calculation's data-quality component.</summary>
    public static decimal ComputeDataQualityScore(DataQualityStatus status, bool hasMissingCandles, bool isDelayed) => status switch
    {
        DataQualityStatus.Good when !hasMissingCandles && !isDelayed => 100m,
        DataQualityStatus.Good => 70m,
        DataQualityStatus.Delayed => 40m,
        DataQualityStatus.Incomplete => 20m,
        DataQualityStatus.Stale => 15m,
        DataQualityStatus.Invalid => 0m,
        _ => 0m
    };
}
