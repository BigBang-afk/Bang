using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Price breaks a recent level, retests it, and continues with confirmation.</summary>
public sealed class BreakoutRetestStrategy : StrategyBase
{
    public override string Key => "breakout-retest";
    public override string DisplayName => "Breakout and Retest";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 40;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var zones = MarketStructureAnalyzer.FindZones(candles);
        var last = candles[^1];

        var bullishRetest = MarketStructureAnalyzer.IsRetestOfBrokenLevel(candles, zones, true);
        var bearishRetest = MarketStructureAnalyzer.IsRetestOfBrokenLevel(candles, zones, false);
        var failedUp = MarketStructureAnalyzer.IsFailedBreakout(candles, zones, true);
        var failedDown = MarketStructureAnalyzer.IsFailedBreakout(candles, zones, false);

        var direction = StrategyDirectionVote.None;
        if (bullishRetest && !failedUp && last.IsBullish)
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "BullishRetestConfirmed", Description = "Price broke resistance, retested the level, and closed bullish confirming continuation." });
        }
        else if (bearishRetest && !failedDown && last.IsBearish)
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "BearishRetestConfirmed", Description = "Price broke support, retested the level, and closed bearish confirming continuation." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoConfirmedRetest", Description = "No confirmed breakout-and-retest pattern detected on the current candle." });
        }

        if (failedUp || failedDown)
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "FailedBreakoutRisk", Description = "A failed breakout was detected nearby, reducing continuation reliability." });

        var trendStrength = TechnicalIndicators.TrendStrength(candles);
        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var breakoutQuality = direction != StrategyDirectionVote.None ? (failedUp || failedDown ? 55 : 90) : 30;
        var scores = new ScoreBreakdown
        {
            TrendScore = trendStrength,
            MarketStructureScore = zones.Count >= 2 ? 85 : 45,
            CandlePressureScore = last.BodyRatio * 100,
            MomentumScore = direction != StrategyDirectionVote.None ? 70 : 30,
            SupportResistanceScore = zones.Count > 0 ? 85 : 30,
            BreakoutScore = breakoutQuality,
            VolatilityScore = VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = MultiTimeframeScore(context, direction)
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.SupportResistanceScore + scores.BreakoutScore + scores.MarketStructureScore) / 3m;

        return new StrategyResult
        {
            StrategyKey = Key,
            StrategyVersion = CurrentVersion,
            Direction = direction,
            RawScore = Math.Round(rawScore, 2),
            Confidence = Math.Round(rawScore, 2),
            MarketCondition = condition,
            Scores = scores,
            Reasons = reasons,
            IndicatorsUsed = new List<string> { "SupportResistanceZones", "BreakoutDetection", "RetestDetection" },
            SupportingCandleIndexes = new List<int> { candles.Count - 1 }
        };
    }
}
