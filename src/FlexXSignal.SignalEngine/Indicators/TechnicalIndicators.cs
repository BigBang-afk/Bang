using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Indicators;

/// <summary>Standard technical indicators used across every strategy. Pure functions over closed candles.</summary>
public static class TechnicalIndicators
{
    /// <summary>Exponential moving average series aligned to the input candles (first `period - 1` values equal the simple average seed).</summary>
    public static decimal[] Ema(IReadOnlyList<CandleData> candles, int period)
    {
        if (candles.Count == 0) return Array.Empty<decimal>();
        var result = new decimal[candles.Count];
        var multiplier = 2m / (period + 1);
        decimal seed = 0;
        var seedCount = Math.Min(period, candles.Count);
        for (var i = 0; i < seedCount; i++) seed += candles[i].Close;
        seed /= seedCount;
        result[seedCount - 1] = seed;
        for (var i = 0; i < seedCount - 1; i++) result[i] = seed;
        for (var i = seedCount; i < candles.Count; i++)
        {
            result[i] = (candles[i].Close - result[i - 1]) * multiplier + result[i - 1];
        }
        return result;
    }

    public static decimal? LastEma(IReadOnlyList<CandleData> candles, int period)
    {
        var series = Ema(candles, period);
        return series.Length == 0 ? null : series[^1];
    }

    /// <summary>Relative Strength Index (Wilder's smoothing), returns null if not enough data.</summary>
    public static decimal? Rsi(IReadOnlyList<CandleData> candles, int period = 14)
    {
        if (candles.Count <= period) return null;

        decimal gainSum = 0, lossSum = 0;
        for (var i = 1; i <= period; i++)
        {
            var change = candles[i].Close - candles[i - 1].Close;
            if (change > 0) gainSum += change; else lossSum -= change;
        }
        var avgGain = gainSum / period;
        var avgLoss = lossSum / period;

        for (var i = period + 1; i < candles.Count; i++)
        {
            var change = candles[i].Close - candles[i - 1].Close;
            var gain = change > 0 ? change : 0;
            var loss = change < 0 ? -change : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss == 0) return 100m;
        var rs = avgGain / avgLoss;
        return 100m - 100m / (1 + rs);
    }

    /// <summary>Average True Range over the last `period` candles.</summary>
    public static decimal? Atr(IReadOnlyList<CandleData> candles, int period = 14)
    {
        if (candles.Count <= period) return null;
        var trueRanges = new List<decimal>();
        for (var i = 1; i < candles.Count; i++)
        {
            var prevClose = candles[i - 1].Close;
            var tr = Math.Max(candles[i].High - candles[i].Low,
                     Math.Max(Math.Abs(candles[i].High - prevClose), Math.Abs(candles[i].Low - prevClose)));
            trueRanges.Add(tr);
        }
        var lastN = trueRanges.Skip(Math.Max(0, trueRanges.Count - period)).ToList();
        return lastN.Count == 0 ? null : lastN.Average();
    }

    /// <summary>Standard deviation of closes over the given window, a simple volatility proxy.</summary>
    public static decimal Volatility(IReadOnlyList<CandleData> candles, int period = 20)
    {
        var window = candles.Skip(Math.Max(0, candles.Count - period)).ToList();
        if (window.Count < 2) return 0;
        var mean = window.Average(c => c.Close);
        var variance = window.Sum(c => (c.Close - mean) * (c.Close - mean)) / window.Count;
        return (decimal)Math.Sqrt((double)variance);
    }

    /// <summary>0-100 trend strength score derived from EMA9/21/50 alignment and slope.</summary>
    public static decimal TrendStrength(IReadOnlyList<CandleData> candles)
    {
        if (candles.Count < 50) return 0;
        var ema9 = Ema(candles, 9);
        var ema21 = Ema(candles, 21);
        var ema50 = Ema(candles, 50);
        var last9 = ema9[^1];
        var last21 = ema21[^1];
        var last50 = ema50[^1];

        decimal score = 0;
        var bullishAlignment = last9 > last21 && last21 > last50;
        var bearishAlignment = last9 < last21 && last21 < last50;
        if (bullishAlignment || bearishAlignment) score += 60;

        var slopeLookback = Math.Min(5, ema9.Length - 1);
        var slope = slopeLookback > 0 ? (ema9[^1] - ema9[^(slopeLookback + 1)]) : 0;
        var avgPrice = candles.TakeLast(20).Average(c => c.Close);
        var normalizedSlope = avgPrice == 0 ? 0 : Math.Abs(slope) / avgPrice * 100;
        score += Math.Min(40, normalizedSlope * 400);

        return Math.Clamp(score, 0, 100);
    }
}
