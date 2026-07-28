using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

public abstract class StrategyBase : ITradingStrategy
{
    public abstract string Key { get; }
    public abstract string DisplayName { get; }
    public abstract int CurrentVersion { get; }
    public abstract int MinimumCandlesRequired { get; }

    public StrategyResult Evaluate(StrategyContext context)
    {
        if (context.ExecutionCandles.Count < MinimumCandlesRequired)
        {
            return StrategyResult.NoSignal(Key, CurrentVersion, MarketCondition.Unclear,
            [
                new StrategyReason { IsSupporting = false, Code = "InsufficientHistory", Description = $"Requires at least {MinimumCandlesRequired} candles, received {context.ExecutionCandles.Count}." }
            ]);
        }
        return EvaluateCore(context);
    }

    protected abstract StrategyResult EvaluateCore(StrategyContext context);

    protected static decimal GetParam(StrategyContext context, string key, decimal fallback) =>
        context.Parameters.TryGetValue(key, out var raw) && decimal.TryParse(raw, out var value) ? value : fallback;

    protected static int GetParam(StrategyContext context, string key, int fallback) =>
        context.Parameters.TryGetValue(key, out var raw) && int.TryParse(raw, out var value) ? value : fallback;

    /// <summary>Volatility-quality score: penalizes extremely quiet or extremely volatile conditions, rewards a healthy mid-range.</summary>
    protected static decimal VolatilityQualityScore(IReadOnlyList<CandleData> candles)
    {
        var shortVol = TechnicalIndicators.Volatility(candles, 10);
        var longVol = TechnicalIndicators.Volatility(candles, 40);
        if (longVol == 0) return 50m;
        var ratio = shortVol / longVol;
        if (ratio < 0.3m || ratio > 2.5m) return 20m;
        if (ratio < 0.5m || ratio > 1.8m) return 60m;
        return 100m;
    }

    protected static decimal DataQualityScore(StrategyContext context) =>
        DataQualityAnalyzer.ComputeDataQualityScore(context.DataQuality, false, false);

    protected static decimal HistoricalScore(StrategyContext context) => Math.Clamp(context.HistoricalWinRatePercent, 0, 100);

    protected static decimal MultiTimeframeScore(StrategyContext context, StrategyDirectionVote direction)
    {
        if (context.HigherTimeframeCandles.Count < 21 || direction == StrategyDirectionVote.None) return 40m;
        var htfTrend = MarketStructureAnalyzer.ClassifyTrend(context.HigherTimeframeCandles);
        var htfEma9 = TechnicalIndicators.LastEma(context.HigherTimeframeCandles, 9);
        var htfEma21 = TechnicalIndicators.LastEma(context.HigherTimeframeCandles, 21);
        if (htfEma9 is null || htfEma21 is null) return 40m;

        var htfBullish = htfEma9 > htfEma21 && htfTrend != StructureTrend.BearishLHLL;
        var htfBearish = htfEma9 < htfEma21 && htfTrend != StructureTrend.BullishHHHL;

        return direction switch
        {
            StrategyDirectionVote.Up when htfBullish => 100m,
            StrategyDirectionVote.Down when htfBearish => 100m,
            StrategyDirectionVote.Up when htfBearish => 10m,
            StrategyDirectionVote.Down when htfBullish => 10m,
            _ => 50m
        };
    }
}
