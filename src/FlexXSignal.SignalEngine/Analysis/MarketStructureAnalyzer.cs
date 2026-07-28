using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Analysis;

public sealed record SwingPoint(int Index, decimal Price, bool IsHigh);

public enum StructureTrend { BullishHHHL, BearishLHLL, Mixed, Unclear }

public sealed class SupportResistanceZone
{
    public decimal Level { get; init; }
    public bool IsResistance { get; init; }
    public int TouchCount { get; init; }
}

public static class MarketStructureAnalyzer
{
    /// <summary>Finds local swing highs/lows using a fractal window (a bar is a swing high/low when it is
    /// the extreme value among `window` bars on each side).</summary>
    public static List<SwingPoint> FindSwingPoints(IReadOnlyList<CandleData> candles, int window = 2)
    {
        var points = new List<SwingPoint>();
        for (var i = window; i < candles.Count - window; i++)
        {
            var isHigh = true;
            var isLow = true;
            for (var w = 1; w <= window; w++)
            {
                if (candles[i].High <= candles[i - w].High || candles[i].High <= candles[i + w].High) isHigh = false;
                if (candles[i].Low >= candles[i - w].Low || candles[i].Low >= candles[i + w].Low) isLow = false;
            }
            if (isHigh) points.Add(new SwingPoint(i, candles[i].High, true));
            if (isLow) points.Add(new SwingPoint(i, candles[i].Low, false));
        }
        return points;
    }

    /// <summary>Classifies the dominant structure (higher highs/higher lows vs lower highs/lower lows) from the last swing points.</summary>
    public static StructureTrend ClassifyTrend(IReadOnlyList<CandleData> candles)
    {
        var swings = FindSwingPoints(candles);
        var highs = swings.Where(s => s.IsHigh).TakeLast(3).ToList();
        var lows = swings.Where(s => !s.IsHigh).TakeLast(3).ToList();
        if (highs.Count < 2 || lows.Count < 2) return StructureTrend.Unclear;

        var higherHighs = highs[^1].Price > highs[^2].Price;
        var higherLows = lows[^1].Price > lows[^2].Price;
        var lowerHighs = highs[^1].Price < highs[^2].Price;
        var lowerLows = lows[^1].Price < lows[^2].Price;

        if (higherHighs && higherLows) return StructureTrend.BullishHHHL;
        if (lowerHighs && lowerLows) return StructureTrend.BearishLHLL;
        if ((higherHighs && lowerLows) || (lowerHighs && higherLows)) return StructureTrend.Mixed;
        return StructureTrend.Unclear;
    }

    /// <summary>Clusters recent swing points into support/resistance zones by proximity (within `tolerancePercent`).</summary>
    public static List<SupportResistanceZone> FindZones(IReadOnlyList<CandleData> candles, decimal tolerancePercent = 0.05m)
    {
        var swings = FindSwingPoints(candles);
        var zones = new List<SupportResistanceZone>();
        foreach (var group in swings.GroupBy(s => s.IsHigh))
        {
            var sorted = group.OrderBy(s => s.Price).ToList();
            var cluster = new List<SwingPoint>();
            foreach (var point in sorted)
            {
                if (cluster.Count == 0 || Math.Abs(point.Price - cluster[^1].Price) / cluster[^1].Price <= tolerancePercent)
                {
                    cluster.Add(point);
                }
                else
                {
                    if (cluster.Count >= 2)
                        zones.Add(new SupportResistanceZone { Level = cluster.Average(p => p.Price), IsResistance = group.Key, TouchCount = cluster.Count });
                    cluster = new List<SwingPoint> { point };
                }
            }
            if (cluster.Count >= 2)
                zones.Add(new SupportResistanceZone { Level = cluster.Average(p => p.Price), IsResistance = group.Key, TouchCount = cluster.Count });
        }
        return zones;
    }

    /// <summary>True when the last closed candle broke above the nearest resistance (or below nearest support for down breaks).</summary>
    public static bool IsBreakout(IReadOnlyList<CandleData> candles, IReadOnlyList<SupportResistanceZone> zones, bool bullish)
    {
        if (candles.Count == 0) return false;
        var last = candles[^1];
        if (bullish)
        {
            var resistance = zones.Where(z => z.IsResistance && z.Level < last.Close).OrderByDescending(z => z.Level).FirstOrDefault();
            return resistance != null && last.Close > resistance.Level && last.Open <= resistance.Level;
        }
        var support = zones.Where(z => !z.IsResistance && z.Level > last.Close).OrderBy(z => z.Level).FirstOrDefault();
        return support != null && last.Close < support.Level && last.Open >= support.Level;
    }

    /// <summary>A failed breakout: price pierced the zone with a wick but closed back inside it.</summary>
    public static bool IsFailedBreakout(IReadOnlyList<CandleData> candles, IReadOnlyList<SupportResistanceZone> zones, bool aboveResistance)
    {
        if (candles.Count == 0) return false;
        var last = candles[^1];
        if (aboveResistance)
        {
            var resistance = zones.Where(z => z.IsResistance).OrderBy(z => Math.Abs(z.Level - last.High)).FirstOrDefault();
            return resistance != null && last.High > resistance.Level && last.Close < resistance.Level;
        }
        var support = zones.Where(z => !z.IsResistance).OrderBy(z => Math.Abs(z.Level - last.Low)).FirstOrDefault();
        return support != null && last.Low < support.Level && last.Close > support.Level;
    }

    /// <summary>A retest occurs when, after a breakout a few bars back, price returns to the broken level and holds.</summary>
    public static bool IsRetestOfBrokenLevel(IReadOnlyList<CandleData> candles, IReadOnlyList<SupportResistanceZone> zones, bool bullish, int lookback = 6)
    {
        if (candles.Count < lookback + 1) return false;
        var recent = candles.TakeLast(lookback + 1).ToList();
        var candidateZones = zones.Where(z => bullish ? z.IsResistance : !z.IsResistance).ToList();
        foreach (var zone in candidateZones)
        {
            var brokeEarlier = recent.Take(lookback).Any(c => bullish ? c.Close > zone.Level : c.Close < zone.Level);
            var last = recent[^1];
            var tolerance = zone.Level * 0.001m;
            var touchedBack = Math.Abs(last.Low - zone.Level) <= tolerance || Math.Abs(last.High - zone.Level) <= tolerance
                               || (bullish ? last.Low <= zone.Level && last.Close > zone.Level : last.High >= zone.Level && last.Close < zone.Level);
            if (brokeEarlier && touchedBack) return true;
        }
        return false;
    }

    /// <summary>A liquidity sweep: the last candle pierces a recent swing high/low (grabbing stop-loss liquidity) then closes back inside the range.</summary>
    public static bool IsLiquiditySweep(IReadOnlyList<CandleData> candles, bool sweepHigh, int lookback = 20)
    {
        if (candles.Count < lookback + 1) return false;
        var window = candles.Skip(candles.Count - lookback - 1).Take(lookback).ToList();
        var last = candles[^1];
        if (sweepHigh)
        {
            var priorHigh = window.Max(c => c.High);
            return last.High > priorHigh && last.Close < priorHigh;
        }
        var priorLow = window.Min(c => c.Low);
        return last.Low < priorLow && last.Close > priorLow;
    }

    /// <summary>Equal highs/lows: two or more recent swing points within a tight tolerance, a classic liquidity pool.</summary>
    public static bool HasEqualLevels(IReadOnlyList<CandleData> candles, bool highs, decimal tolerancePercent = 0.02m)
    {
        var swings = FindSwingPoints(candles).Where(s => s.IsHigh == highs).TakeLast(4).ToList();
        for (var i = 0; i < swings.Count; i++)
            for (var j = i + 1; j < swings.Count; j++)
                if (swings[i].Price != 0 && Math.Abs(swings[i].Price - swings[j].Price) / swings[i].Price <= tolerancePercent)
                    return true;
        return false;
    }

    public static MarketCondition DetermineMarketCondition(IReadOnlyList<CandleData> candles, decimal trendStrength, decimal volatility, decimal avgVolatility)
    {
        if (candles.Count < 20) return MarketCondition.Unclear;
        if (avgVolatility > 0 && volatility > avgVolatility * 2.5m) return MarketCondition.Volatile;
        if (avgVolatility > 0 && volatility < avgVolatility * 0.3m) return MarketCondition.Quiet;
        var trend = ClassifyTrend(candles);
        if (trend is StructureTrend.BullishHHHL or StructureTrend.BearishLHLL && trendStrength >= 55) return MarketCondition.Trending;
        if (trend == StructureTrend.Mixed || trend == StructureTrend.Unclear) return MarketCondition.Ranging;
        return MarketCondition.Ranging;
    }
}
