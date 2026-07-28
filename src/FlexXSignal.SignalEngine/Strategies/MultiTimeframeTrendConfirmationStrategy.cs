using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Requires agreement between the execution timeframe and a higher timeframe before signaling.</summary>
public sealed class MultiTimeframeTrendConfirmationStrategy : StrategyBase
{
    public override string Key => "multi-timeframe-trend-confirmation";
    public override string DisplayName => "Multi-Timeframe Trend Confirmation";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 55;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();

        if (context.HigherTimeframeCandles.Count < 21)
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "MissingHigherTimeframeData", Description = "Higher-timeframe candles are unavailable; multi-timeframe confirmation cannot be evaluated." });
            return StrategyResult.NoSignal(Key, CurrentVersion, MarketCondition.Unclear, reasons);
        }

        var execEma9 = TechnicalIndicators.LastEma(candles, 9)!.Value;
        var execEma21 = TechnicalIndicators.LastEma(candles, 21)!.Value;
        var execTrend = MarketStructureAnalyzer.ClassifyTrend(candles);

        var htfEma9 = TechnicalIndicators.LastEma(context.HigherTimeframeCandles, 9)!.Value;
        var htfEma21 = TechnicalIndicators.LastEma(context.HigherTimeframeCandles, 21)!.Value;
        var htfTrend = MarketStructureAnalyzer.ClassifyTrend(context.HigherTimeframeCandles);

        var execBullish = execEma9 > execEma21 && execTrend != StructureTrend.BearishLHLL;
        var execBearish = execEma9 < execEma21 && execTrend != StructureTrend.BullishHHHL;
        var htfBullish = htfEma9 > htfEma21 && htfTrend != StructureTrend.BearishLHLL;
        var htfBearish = htfEma9 < htfEma21 && htfTrend != StructureTrend.BullishHHHL;

        var direction = StrategyDirectionVote.None;
        if (execBullish && htfBullish)
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "MultiTimeframeBullishAgreement", Description = "Both the execution timeframe and the higher timeframe show a bullish EMA structure." });
        }
        else if (execBearish && htfBearish)
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "MultiTimeframeBearishAgreement", Description = "Both the execution timeframe and the higher timeframe show a bearish EMA structure." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "TimeframeDisagreement", Description = "Execution and higher timeframe trends disagree; no confirmation available." });
        }

        var trendStrength = TechnicalIndicators.TrendStrength(candles);
        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);
        var mtfScore = MultiTimeframeScore(context, direction);

        var scores = new ScoreBreakdown
        {
            TrendScore = trendStrength,
            MarketStructureScore = direction != StrategyDirectionVote.None ? 75 : 35,
            CandlePressureScore = candles[^1].BodyRatio * 100,
            MomentumScore = 45,
            SupportResistanceScore = 40,
            BreakoutScore = 35,
            VolatilityScore = VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = mtfScore
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.MultiTimeframeScore + scores.TrendScore + scores.MarketStructureScore) / 3m;

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
            IndicatorsUsed = new List<string> { "EMA9", "EMA21", "HigherTimeframeTrend" },
            SupportingCandleIndexes = new List<int> { candles.Count - 1 }
        };
    }
}
