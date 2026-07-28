using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Analyzes consecutive candle bodies, wicks, and direction changes to detect building pressure.</summary>
public sealed class CandlePressureSequenceStrategy : StrategyBase
{
    public override string Key => "candle-pressure-sequence";
    public override string DisplayName => "Candle Pressure Sequence";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 20;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var last = candles[^1];
        var prev = candles[^2];

        var pressure = CandlePatternAnalyzer.NetCandlePressure(candles, 6);
        var consecutive = CandlePatternAnalyzer.ConsecutiveDirectionalCount(candles);
        var bullishEngulf = CandlePatternAnalyzer.IsBullishEngulfing(prev, last);
        var bearishEngulf = CandlePatternAnalyzer.IsBearishEngulfing(prev, last);
        var isDoji = CandlePatternAnalyzer.IsDoji(last);
        var abnormal = CandlePatternAnalyzer.IsAbnormallyLarge(candles, candles.Count - 1);

        var direction = StrategyDirectionVote.None;
        if ((pressure > 0.2m && consecutive >= 3) || bullishEngulf)
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = bullishEngulf ? "BullishEngulfing" : "BuildingBullishPressure", Description = bullishEngulf ? "Bullish engulfing candle reversed prior selling pressure." : $"{consecutive} consecutive bullish candles with rising net pressure ({pressure:F2})." });
        }
        else if ((pressure < -0.2m && consecutive <= -3) || bearishEngulf)
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = bearishEngulf ? "BearishEngulfing" : "BuildingBearishPressure", Description = bearishEngulf ? "Bearish engulfing candle reversed prior buying pressure." : $"{Math.Abs(consecutive)} consecutive bearish candles with falling net pressure ({pressure:F2})." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoPressureBuildup", Description = "Candle sequence does not show a decisive directional pressure buildup." });
        }

        if (isDoji)
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "DojiIndecision", Description = "Latest candle is a doji, indicating market indecision." });
        if (abnormal)
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "AbnormalCandleSize", Description = "Latest candle range is abnormally large versus recent average, reducing reliability." });

        var trendStrength = TechnicalIndicators.TrendStrength(candles.Count >= 50 ? candles : candles);
        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, Math.Min(40, candles.Count));
        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var scores = new ScoreBreakdown
        {
            TrendScore = 35,
            MarketStructureScore = 40,
            CandlePressureScore = Math.Clamp(Math.Abs(pressure) * 200, 0, 100),
            MomentumScore = Math.Clamp(Math.Abs(consecutive) * 15, 0, 100),
            SupportResistanceScore = 30,
            BreakoutScore = 30,
            VolatilityScore = isDoji || abnormal ? 30 : VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = MultiTimeframeScore(context, direction)
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.CandlePressureScore + scores.MomentumScore) / 2m;

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
            IndicatorsUsed = new List<string> { "NetCandlePressure", "ConsecutiveDirectionCount", "EngulfingDetection" },
            SupportingCandleIndexes = Enumerable.Range(Math.Max(0, candles.Count - Math.Abs(consecutive)), Math.Min(candles.Count, Math.Max(1, Math.Abs(consecutive)))).ToList()
        };
    }
}
