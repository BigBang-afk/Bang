using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Strong wick rejection from a confirmed support or resistance zone.</summary>
public sealed class SupportResistanceRejectionStrategy : StrategyBase
{
    public override string Key => "support-resistance-rejection";
    public override string DisplayName => "Support and Resistance Rejection";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 40;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var last = candles[^1];
        var zones = MarketStructureAnalyzer.FindZones(candles).Where(z => z.TouchCount >= 2).ToList();

        SupportResistanceZone? nearestSupport = zones.Where(z => !z.IsResistance && z.Level <= last.High)
            .OrderBy(z => Math.Abs(z.Level - last.Low)).FirstOrDefault();
        SupportResistanceZone? nearestResistance = zones.Where(z => z.IsResistance && z.Level >= last.Low)
            .OrderBy(z => Math.Abs(z.Level - last.High)).FirstOrDefault();

        var direction = StrategyDirectionVote.None;
        SupportResistanceZone? touchedZone = null;

        var tolerance = last.Range > 0 ? last.Range * 0.3m : last.Close * 0.001m;
        if (nearestSupport is not null && Math.Abs(last.Low - nearestSupport.Level) <= tolerance
            && CandlePatternAnalyzer.IsBullishRejection(last) && last.Close > nearestSupport.Level)
        {
            direction = StrategyDirectionVote.Up;
            touchedZone = nearestSupport;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "SupportRejection", Description = $"Price wicked into a confirmed support zone ({nearestSupport.TouchCount} touches) and rejected with a strong lower wick." });
        }
        else if (nearestResistance is not null && Math.Abs(last.High - nearestResistance.Level) <= tolerance
            && CandlePatternAnalyzer.IsBearishRejection(last) && last.Close < nearestResistance.Level)
        {
            direction = StrategyDirectionVote.Down;
            touchedZone = nearestResistance;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "ResistanceRejection", Description = $"Price wicked into a confirmed resistance zone ({nearestResistance.TouchCount} touches) and rejected with a strong upper wick." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoZoneRejection", Description = "Current candle did not produce a qualifying rejection at a confirmed support/resistance zone." });
        }

        var trendStrength = TechnicalIndicators.TrendStrength(candles);
        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = direction != StrategyDirectionVote.None ? MarketCondition.Reversal
            : MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var scores = new ScoreBreakdown
        {
            TrendScore = 40,
            MarketStructureScore = zones.Count > 0 ? 75 : 30,
            CandlePressureScore = direction == StrategyDirectionVote.Up ? last.LowerWickRatio * 100 : direction == StrategyDirectionVote.Down ? last.UpperWickRatio * 100 : 20,
            MomentumScore = 35,
            SupportResistanceScore = touchedZone is not null ? Math.Min(100, 60 + touchedZone.TouchCount * 10) : 25,
            BreakoutScore = 30,
            VolatilityScore = VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = MultiTimeframeScore(context, direction)
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.SupportResistanceScore + scores.CandlePressureScore + scores.MarketStructureScore) / 3m;

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
            IndicatorsUsed = new List<string> { "SupportResistanceZones", "WickRejectionRatio" },
            SupportingCandleIndexes = new List<int> { candles.Count - 1 }
        };
    }
}
