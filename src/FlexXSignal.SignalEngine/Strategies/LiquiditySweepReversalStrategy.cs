using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Price sweeps a recent high or low and closes back inside the range.</summary>
public sealed class LiquiditySweepReversalStrategy : StrategyBase
{
    public override string Key => "liquidity-sweep-reversal";
    public override string DisplayName => "Liquidity Sweep Reversal";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 30;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var last = candles[^1];

        var sweptHigh = MarketStructureAnalyzer.IsLiquiditySweep(candles, sweepHigh: true);
        var sweptLow = MarketStructureAnalyzer.IsLiquiditySweep(candles, sweepHigh: false);
        var equalHighs = MarketStructureAnalyzer.HasEqualLevels(candles, highs: true);
        var equalLows = MarketStructureAnalyzer.HasEqualLevels(candles, highs: false);

        var direction = StrategyDirectionVote.None;
        if (sweptHigh && CandlePatternAnalyzer.IsBearishRejection(last))
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "HighLiquiditySwept", Description = "Recent swing high was swept and price closed back inside the range with rejection." });
            if (equalHighs) reasons.Add(new StrategyReason { IsSupporting = true, Code = "EqualHighsLiquidityPool", Description = "Equal highs formed an obvious liquidity pool prior to the sweep." });
        }
        else if (sweptLow && CandlePatternAnalyzer.IsBullishRejection(last))
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "LowLiquiditySwept", Description = "Recent swing low was swept and price closed back inside the range with rejection." });
            if (equalLows) reasons.Add(new StrategyReason { IsSupporting = true, Code = "EqualLowsLiquidityPool", Description = "Equal lows formed an obvious liquidity pool prior to the sweep." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoLiquiditySweep", Description = "No confirmed liquidity sweep with rejection on the current candle." });
        }

        var trendStrength = TechnicalIndicators.TrendStrength(candles);
        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = direction != StrategyDirectionVote.None ? MarketCondition.Reversal
            : MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var scores = new ScoreBreakdown
        {
            TrendScore = direction != StrategyDirectionVote.None ? 55 : 30,
            MarketStructureScore = (equalHighs || equalLows) ? 85 : 55,
            CandlePressureScore = direction == StrategyDirectionVote.Up ? last.LowerWickRatio * 100 : direction == StrategyDirectionVote.Down ? last.UpperWickRatio * 100 : 20,
            MomentumScore = 40,
            SupportResistanceScore = 90,
            BreakoutScore = direction != StrategyDirectionVote.None ? 75 : 20,
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
            IndicatorsUsed = new List<string> { "LiquiditySweepDetection", "EqualHighsLows", "RejectionWicks" },
            SupportingCandleIndexes = new List<int> { candles.Count - 1 }
        };
    }
}
