using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Analysis;
using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Filters;

public sealed record FilterOutcome(bool Blocked, string? Code, string? Reason)
{
    public static readonly FilterOutcome Pass = new(false, null, null);
    public static FilterOutcome Block(string code, string reason) => new(true, code, reason);
}

/// <summary>Environmental facts the pure engine cannot compute itself (rate limits, provider state, strategy
/// enablement) but that no-trade filters must consider. Populated by the orchestrating Application service.</summary>
public sealed class NoTradeEnvironment
{
    public required bool StrategyEnabled { get; init; }
    public required bool ProviderConnected { get; init; }
    public required int SignalsPublishedThisHour { get; init; }
    public required int MaxSignalsPerHour { get; init; }
    public required decimal DailyRealizedLossPercent { get; init; }
    public required decimal DailyLossLimitPercent { get; init; }
    public required TimeSpan TimeUntilEntry { get; init; }
    public required TimeSpan MinimumTimeBeforeEntry { get; init; }
    public required bool RequiresHigherTimeframeData { get; init; }
    public required bool HasHigherTimeframeData { get; init; }
}

public interface INoTradeFilter
{
    string Code { get; }
    FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env);
}

public sealed class DataIncompleteFilter : INoTradeFilter
{
    public string Code => "DataIncomplete";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        context.DataQuality is DataQualityStatus.Incomplete or DataQualityStatus.Invalid
            ? FilterOutcome.Block(Code, "Candle data is incomplete or invalid for this evaluation window.")
            : FilterOutcome.Pass;
}

public sealed class DelayedDataFilter : INoTradeFilter
{
    public string Code => "DelayedData";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        context.DataQuality is DataQualityStatus.Delayed or DataQualityStatus.Stale
            ? FilterOutcome.Block(Code, "Candle timestamps are delayed or stale relative to the provider clock.")
            : FilterOutcome.Pass;
}

public sealed class VolatilityExtremeFilter : INoTradeFilter
{
    public string Code => "VolatilityOutOfRange";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        result.Scores.VolatilityScore <= 20
            ? FilterOutcome.Block(Code, "Volatility is extremely high or extremely low for reliable execution.")
            : FilterOutcome.Pass;
}

public sealed class MarketStructureUnclearFilter : INoTradeFilter
{
    public string Code => "MarketStructureUnclear";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        result.MarketCondition == MarketCondition.Unclear
            ? FilterOutcome.Block(Code, "Market structure could not be classified with confidence.")
            : FilterOutcome.Pass;
}

public sealed class NarrowRangeFilter : INoTradeFilter
{
    public string Code => "NarrowRangeTrap";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        CandlePatternAnalyzer.IsLowVolatilityPeriod(context.ExecutionCandles)
            ? FilterOutcome.Block(Code, "Price is trapped in a narrow range with insufficient movement to trade.")
            : FilterOutcome.Pass;
}

public sealed class NoDirectionFilter : INoTradeFilter
{
    public string Code => "NoDirection";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        result.Direction == StrategyDirectionVote.None
            ? FilterOutcome.Block(Code, "Strategy conditions did not converge on a direction, or internally conflicted.")
            : FilterOutcome.Pass;
}

public sealed class ConfidenceThresholdFilter : INoTradeFilter
{
    public string Code => "BelowConfidenceThreshold";
    private readonly decimal _minimum;
    public ConfidenceThresholdFilter(decimal minimum) => _minimum = minimum;
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        result.Confidence < _minimum
            ? FilterOutcome.Block(Code, $"Confidence {result.Confidence:F1} is below the administrator threshold of {_minimum:F1}.")
            : FilterOutcome.Pass;
}

public sealed class EntryTimingFilter : INoTradeFilter
{
    public string Code => "EntryTimingInvalid";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        env.TimeUntilEntry < env.MinimumTimeBeforeEntry
            ? FilterOutcome.Block(Code, "Entry time is too close or has already passed.")
            : FilterOutcome.Pass;
}

public sealed class HigherTimeframeDataFilter : INoTradeFilter
{
    public string Code => "MissingHigherTimeframeData";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        env.RequiresHigherTimeframeData && !env.HasHigherTimeframeData
            ? FilterOutcome.Block(Code, "Required higher-timeframe data is missing.")
            : FilterOutcome.Pass;
}

public sealed class MaxSignalsPerHourFilter : INoTradeFilter
{
    public string Code => "MaxSignalsPerHourReached";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        env.SignalsPublishedThisHour >= env.MaxSignalsPerHour
            ? FilterOutcome.Block(Code, "Maximum signals per hour has been reached for this strategy.")
            : FilterOutcome.Pass;
}

public sealed class DailyLossLimitFilter : INoTradeFilter
{
    public string Code => "DailyLossLimitReached";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        env.DailyRealizedLossPercent >= env.DailyLossLimitPercent
            ? FilterOutcome.Block(Code, "Daily loss limit for this strategy has been reached.")
            : FilterOutcome.Pass;
}

public sealed class StrategyDisabledFilter : INoTradeFilter
{
    public string Code => "StrategyDisabled";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        !env.StrategyEnabled
            ? FilterOutcome.Block(Code, "Strategy is disabled by the administrator.")
            : FilterOutcome.Pass;
}

public sealed class ProviderDisconnectedFilter : INoTradeFilter
{
    public string Code => "ProviderDisconnected";
    public FilterOutcome Evaluate(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        !env.ProviderConnected
            ? FilterOutcome.Block(Code, "Market data provider is disconnected.")
            : FilterOutcome.Pass;
}

public sealed class NoTradeFilterPipeline
{
    private readonly List<INoTradeFilter> _filters;

    public NoTradeFilterPipeline(decimal minimumConfidence)
    {
        _filters = new List<INoTradeFilter>
        {
            new ProviderDisconnectedFilter(),
            new StrategyDisabledFilter(),
            new DataIncompleteFilter(),
            new DelayedDataFilter(),
            new HigherTimeframeDataFilter(),
            new MarketStructureUnclearFilter(),
            new NarrowRangeFilter(),
            new VolatilityExtremeFilter(),
            new NoDirectionFilter(),
            new ConfidenceThresholdFilter(minimumConfidence),
            new EntryTimingFilter(),
            new MaxSignalsPerHourFilter(),
            new DailyLossLimitFilter(),
        };
    }

    /// <summary>Runs every filter and returns all blocking reasons (not just the first) so the analysis
    /// panel and admin monitoring can show a complete rejection explanation.</summary>
    public List<FilterOutcome> EvaluateAll(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        _filters.Select(f => f.Evaluate(context, result, env)).Where(o => o.Blocked).ToList();

    public bool CanPublish(StrategyContext context, StrategyResult result, NoTradeEnvironment env) =>
        EvaluateAll(context, result, env).Count == 0;
}
