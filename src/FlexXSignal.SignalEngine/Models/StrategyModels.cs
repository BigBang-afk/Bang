using FlexXSignal.Domain.Enums;

namespace FlexXSignal.SignalEngine.Models;

public enum StrategyDirectionVote
{
    None = 0,
    Up = 1,
    Down = 2
}

/// <summary>Everything a strategy needs to evaluate one pair at one point in time.</summary>
public sealed class StrategyContext
{
    public required string PairSymbol { get; init; }
    public required PairMarketType MarketType { get; init; }
    public required Timeframe ExecutionTimeframe { get; init; }
    /// <summary>Closed candles for the execution timeframe, oldest first, most recent last (the "current" bar for analysis).</summary>
    public required IReadOnlyList<CandleData> ExecutionCandles { get; init; }
    /// <summary>Closed candles for a higher timeframe used for multi-timeframe confirmation, may be empty if unavailable.</summary>
    public IReadOnlyList<CandleData> HigherTimeframeCandles { get; init; } = Array.Empty<CandleData>();
    public required DateTime EvaluationTimeUtc { get; init; }
    public required ExpirationDuration ProposedExpiration { get; init; }
    public IReadOnlyDictionary<string, string> Parameters { get; init; } = new Dictionary<string, string>();
    /// <summary>Historical win rate (0-100) for this strategy version, used for the historical-performance score component.</summary>
    public decimal HistoricalWinRatePercent { get; init; } = 50m;
    public DataQualityStatus DataQuality { get; init; } = DataQualityStatus.Good;
}

public sealed class ScoreBreakdown
{
    public decimal TrendScore { get; set; }
    public decimal MarketStructureScore { get; set; }
    public decimal MomentumScore { get; set; }
    public decimal CandlePressureScore { get; set; }
    public decimal SupportResistanceScore { get; set; }
    public decimal BreakoutScore { get; set; }
    public decimal VolatilityScore { get; set; }
    public decimal DataQualityScore { get; set; }
    public decimal HistoricalStrategyScore { get; set; }
    public decimal MultiTimeframeScore { get; set; }
}

public sealed class StrategyReason
{
    public bool IsSupporting { get; init; }
    public required string Code { get; init; }
    public required string Description { get; init; }
}

/// <summary>Result contract every ITradingStrategy implementation must return.</summary>
public sealed class StrategyResult
{
    public required string StrategyKey { get; init; }
    public required int StrategyVersion { get; init; }
    public StrategyDirectionVote Direction { get; init; }
    public decimal RawScore { get; init; } // 0-100, pre-calibration
    public decimal Confidence { get; init; } // 0-100, post-calibration
    public MarketCondition MarketCondition { get; init; }
    public ScoreBreakdown Scores { get; init; } = new();
    public List<StrategyReason> Reasons { get; init; } = new();
    public List<string> IndicatorsUsed { get; init; } = new();
    public List<int> SupportingCandleIndexes { get; init; } = new();

    public static StrategyResult NoSignal(string key, int version, MarketCondition condition, IEnumerable<StrategyReason> reasons) => new()
    {
        StrategyKey = key,
        StrategyVersion = version,
        Direction = StrategyDirectionVote.None,
        MarketCondition = condition,
        Reasons = reasons.ToList()
    };
}
