using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Indicators;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Strong directional candle pressure, trend alignment, and breakout continuation.</summary>
public sealed class MomentumContinuationStrategy : StrategyBase
{
    public override string Key => "momentum-continuation";
    public override string DisplayName => "Momentum Continuation";
    public override int CurrentVersion => 1;
    public override int MinimumCandlesRequired => 55;

    protected override StrategyResult EvaluateCore(StrategyContext context)
    {
        var candles = context.ExecutionCandles;
        var reasons = new List<StrategyReason>();
        var indicatorsUsed = new List<string> { "EMA9", "EMA21", "EMA50", "RSI14", "CandlePressure" };

        var ema9 = TechnicalIndicators.LastEma(candles, 9)!.Value;
        var ema21 = TechnicalIndicators.LastEma(candles, 21)!.Value;
        var ema50 = TechnicalIndicators.LastEma(candles, 50)!.Value;
        var rsi = TechnicalIndicators.Rsi(candles) ?? 50m;
        var pressure = CandlePatternAnalyzer.NetCandlePressure(candles);
        var consecutive = CandlePatternAnalyzer.ConsecutiveDirectionalCount(candles);
        var trendStrength = TechnicalIndicators.TrendStrength(candles);

        var bullishAligned = ema9 > ema21 && ema21 > ema50;
        var bearishAligned = ema9 < ema21 && ema21 < ema50;

        var direction = StrategyDirectionVote.None;
        if (bullishAligned && pressure > 0.15m && consecutive >= 2 && rsi is > 50 and < 82)
        {
            direction = StrategyDirectionVote.Up;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "EmaBullishAlignment", Description = "EMA9 > EMA21 > EMA50, indicating an active uptrend." });
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "PositiveCandlePressure", Description = $"{consecutive} consecutive bullish candles with net pressure {pressure:F2}." });
        }
        else if (bearishAligned && pressure < -0.15m && consecutive <= -2 && rsi is < 50 and > 18)
        {
            direction = StrategyDirectionVote.Down;
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "EmaBearishAlignment", Description = "EMA9 < EMA21 < EMA50, indicating an active downtrend." });
            reasons.Add(new StrategyReason { IsSupporting = true, Code = "NegativeCandlePressure", Description = $"{Math.Abs(consecutive)} consecutive bearish candles with net pressure {pressure:F2}." });
        }
        else
        {
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "NoMomentumAlignment", Description = "EMA stack, candle pressure and RSI are not aligned strongly enough for continuation." });
        }

        if (rsi is > 85 or < 15)
            reasons.Add(new StrategyReason { IsSupporting = false, Code = "MomentumExhaustion", Description = $"RSI at {rsi:F1} suggests momentum exhaustion risk." });

        var volatility = TechnicalIndicators.Volatility(candles, 10);
        var avgVolatility = TechnicalIndicators.Volatility(candles, 40);
        var condition = MarketStructureAnalyzer.DetermineMarketCondition(candles, trendStrength, volatility, avgVolatility);

        var scores = new ScoreBreakdown
        {
            TrendScore = Math.Min(100, trendStrength + (direction != StrategyDirectionVote.None ? 10 : 0)),
            MarketStructureScore = bullishAligned || bearishAligned ? 80 : 40,
            CandlePressureScore = Math.Clamp(Math.Abs(pressure) * 200, 0, 100),
            MomentumScore = direction == StrategyDirectionVote.Up ? Math.Clamp((rsi - 50) * 2.5m, 0, 100) : direction == StrategyDirectionVote.Down ? Math.Clamp((50 - rsi) * 2.5m, 0, 100) : 30,
            SupportResistanceScore = 50,
            BreakoutScore = MarketStructureAnalyzer.IsBreakout(candles, MarketStructureAnalyzer.FindZones(candles), direction == StrategyDirectionVote.Up) ? 90 : 40,
            VolatilityScore = VolatilityQualityScore(candles),
            DataQualityScore = DataQualityScore(context),
            HistoricalStrategyScore = HistoricalScore(context),
            MultiTimeframeScore = MultiTimeframeScore(context, direction)
        };

        var rawScore = direction == StrategyDirectionVote.None ? 0 :
            (scores.TrendScore + scores.CandlePressureScore + scores.MomentumScore + scores.BreakoutScore) / 4m;

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
            IndicatorsUsed = indicatorsUsed,
            SupportingCandleIndexes = Enumerable.Range(Math.Max(0, candles.Count - Math.Abs(consecutive)), Math.Min(candles.Count, Math.Abs(consecutive))).ToList()
        };
    }
}
