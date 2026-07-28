using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Trade in the dominant trend direction after a controlled pullback to the EMA21 zone.</summary>
public sealed class TrendPullbackStrategy : StrategyBase
{
    public override string Key => "trend-pullback";
    public override string DisplayName => "Trend Pullback";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 55;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var last = candles[^1];

        var ema9 = TechnicalIndicators.LastEma(candles, 9)!.Value;
        var ema21 = TechnicalIndicators.LastEma(candles, 21)!.Value;
        var ema50 = TechnicalIndicators.LastEma(candles, 50)!.Value;
        var trend = MarketStructureAnalyzer.ClassifyTrend(candles);
        var trendStrength = TechnicalIndicators.TrendStrength(candles);

        var bullishTrend = ema21 > ema50 && trend != StructureTrend.BearishLHLL;
        var bearishTrend = ema21 < ema50 && trend != StructureTrend.BullishHHHL;

        var pulledToEma = last.Low <= ema21 * 1.0015m && last.Low >= ema21 * 0.9985m;
        var pulledFromAboveToEma = last.High >= ema21 * 0.9985m && last.High <= ema21 * 1.0015m;

        var direction = StrategyDirectionVote.None;
        if (bullishTrend && pulledToEma && last.Close > ema21 && last.IsBullish)
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "BullishPullbackToEma21", Description = "Uptrend intact (EMA21 > EMA50); price pulled back to EMA21 and closed bullish." });
        }
        else if (bearishTrend && pulledFromAboveToEma && last.Close < ema21 && last.IsBearish)
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "BearishPullbackToEma21", Description = "Downtrend intact (EMA21 < EMA50); price pulled back to EMA21 and closed bearish." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoQualifyingPullback", Description = "No controlled pullback to the EMA21 zone within an established trend was detected." });
        }

        if (trendStrength < 40)
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "WeakTrend", Description = $"Trend strength is only {trendStrength:F0}/100, below the reliable pullback threshold." });

        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var scores = new ScoreBreakdown
        {
            TrendScore = trendStrength,
            MarketStructureScore = (bullishTrend || bearishTrend) ? 80 : 35,
            CandlePressureScore = last.BodyRatio * 100,
            MomentumScore = direction != StrategyDirectionVote.None ? 65 : 25,
            SupportResistanceScore = (pulledToEma || pulledFromAboveToEma) ? 75 : 30,
            BreakoutScore = 40,
            VolatilityScore = VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = MultiTimeframeScore(context, direction)
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.TrendScore + scores.MarketStructureScore + scores.SupportResistanceScore) / 3m;

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
            IndicatorsUsed = new List<string> { "EMA9", "EMA21", "EMA50", "TrendStructure" },
            SupportingCandleIndexes = new List<int> { candles.Count - 1 }
        };
    }
}
