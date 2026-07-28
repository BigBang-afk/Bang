using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Analysis;

public static class CandlePatternAnalyzer
{
    public static bool IsDoji(CandleData c, decimal bodyThreshold = 0.1m) => c.Range > 0 && c.BodyRatio <= bodyThreshold;

    public static bool IsBullishPinBar(CandleData c) =>
        c.Range > 0 && c.LowerWickRatio >= 0.6m && c.BodyRatio <= 0.3m && c.IsBullish;

    public static bool IsBearishPinBar(CandleData c) =>
        c.Range > 0 && c.UpperWickRatio >= 0.6m && c.BodyRatio <= 0.3m && c.IsBearish;

    public static bool IsBullishRejection(CandleData c) => c.Range > 0 && c.LowerWickRatio >= 0.5m;
    public static bool IsBearishRejection(CandleData c) => c.Range > 0 && c.UpperWickRatio >= 0.5m;

    public static bool IsBullishEngulfing(CandleData prev, CandleData curr) =>
        prev.IsBearish && curr.IsBullish && curr.Open <= prev.Close && curr.Close >= prev.Open;

    public static bool IsBearishEngulfing(CandleData prev, CandleData curr) =>
        prev.IsBullish && curr.IsBearish && curr.Open >= prev.Close && curr.Close <= prev.Open;

    public static bool IsInsideBar(CandleData prev, CandleData curr) => curr.High <= prev.High && curr.Low >= prev.Low;

    public static bool IsOutsideBar(CandleData prev, CandleData curr) => curr.High >= prev.High && curr.Low <= prev.Low;

    /// <summary>A candle is "abnormally large" when its range exceeds `multiplier` times the average range of the lookback window.</summary>
    public static bool IsAbnormallyLarge(IReadOnlyList<CandleData> candles, int index, int lookback = 20, decimal multiplier = 3m)
    {
        var start = Math.Max(0, index - lookback);
        var window = candles.Skip(start).Take(index - start).ToList();
        if (window.Count == 0) return false;
        var avgRange = window.Average(c => c.Range);
        return avgRange > 0 && candles[index].Range > avgRange * multiplier;
    }

    /// <summary>Counts consecutive same-direction candles ending at the last candle (candle pressure sequence).</summary>
    public static int ConsecutiveDirectionalCount(IReadOnlyList<CandleData> candles)
    {
        if (candles.Count == 0) return 0;
        var lastBullish = candles[^1].IsBullish;
        var count = 0;
        for (var i = candles.Count - 1; i >= 0; i--)
        {
            if (candles[i].IsBullish == lastBullish && candles[i].BodySize > 0) count++;
            else break;
        }
        return lastBullish ? count : -count;
    }

    /// <summary>Cumulative net candle-pressure score across a lookback window: bullish bodies add, bearish bodies subtract,
    /// each weighted by relative body size, producing a directional pressure signal used by the Candle Pressure Sequence strategy.</summary>
    public static decimal NetCandlePressure(IReadOnlyList<CandleData> candles, int lookback = 6)
    {
        var window = candles.TakeLast(lookback).ToList();
        if (window.Count == 0) return 0;
        var avgRange = window.Average(c => c.Range);
        if (avgRange == 0) return 0;
        decimal pressure = 0;
        foreach (var c in window)
        {
            var weight = c.Range / avgRange;
            pressure += (c.IsBullish ? 1 : c.IsBearish ? -1 : 0) * weight * c.BodyRatio;
        }
        return pressure / window.Count;
    }

    public static bool IsLowVolatilityPeriod(IReadOnlyList<CandleData> candles, int lookback = 20, decimal thresholdRatio = 0.3m)
    {
        var window = candles.TakeLast(lookback).ToList();
        if (window.Count < 2) return false;
        var avgRange = window.Average(c => c.Range);
        var longerWindow = candles.TakeLast(lookback * 3).ToList();
        var longAvgRange = longerWindow.Count == 0 ? avgRange : longerWindow.Average(c => c.Range);
        return longAvgRange > 0 && avgRange < longAvgRange * thresholdRatio;
    }

    public static bool IsLowVolumePeriod(IReadOnlyList<CandleData> candles, int lookback = 20, decimal thresholdRatio = 0.3m)
    {
        var window = candles.TakeLast(lookback).ToList();
        if (window.Count < 2 || window[^1].Volume == 0) return false;
        var avgVolume = window.Average(c => c.Volume);
        return avgVolume > 0 && window[^1].Volume < avgVolume * thresholdRatio;
    }
}
