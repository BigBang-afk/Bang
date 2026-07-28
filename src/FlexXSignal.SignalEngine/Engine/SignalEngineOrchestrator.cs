using FlexXSignal.SignalEngine.Confidence;
using FlexXSignal.SignalEngine.Filters;
using FlexXSignal.SignalEngine.Models;
using FlexXSignal.SignalEngine.Strategies;

namespace FlexXSignal.SignalEngine.Engine;

public sealed class SignalGenerationOutcome
{
    public required bool Published { get; init; }
    public required StrategyResult StrategyResult { get; init; }
    public required decimal CalibratedConfidence { get; init; }
    public required List<FilterOutcome> BlockingReasons { get; init; }
}

/// <summary>
/// Ties together strategy evaluation, confidence calibration and the no-trade filter pipeline.
/// This is the single entry point background services use to decide whether to publish a signal;
/// it never fabricates data and never mutates a result after it is returned.
/// </summary>
public sealed class SignalEngineOrchestrator
{
    private readonly IReadOnlyDictionary<string, ITradingStrategy> _strategies;

    public SignalEngineOrchestrator(IEnumerable<ITradingStrategy> strategies)
    {
        _strategies = strategies.ToDictionary(s => s.Key, s => s);
    }

    public IReadOnlyCollection<ITradingStrategy> AvailableStrategies => _strategies.Values.ToList();

    public SignalGenerationOutcome Evaluate(
        string strategyKey,
        StrategyContext context,
        ConfidenceWeights weights,
        decimal minimumPublishConfidence,
        decimal? historicalBandWinRate,
        NoTradeEnvironment environment)
    {
        if (!_strategies.TryGetValue(strategyKey, out var strategy))
            throw new InvalidOperationException($"No strategy registered for key '{strategyKey}'.");

        var result = strategy.Evaluate(context);

        var rawConfidence = ConfidenceCalculator.CalculateRawConfidence(result.Scores, weights);
        var calibrated = ConfidenceCalculator.Calibrate(rawConfidence, historicalBandWinRate);

        var calibratedResult = new StrategyResult
        {
            StrategyKey = result.StrategyKey,
            StrategyVersion = result.StrategyVersion,
            Direction = result.Direction,
            RawScore = result.RawScore,
            Confidence = calibrated,
            MarketCondition = result.MarketCondition,
            Scores = result.Scores,
            Reasons = result.Reasons,
            IndicatorsUsed = result.IndicatorsUsed,
            SupportingCandleIndexes = result.SupportingCandleIndexes
        };

        var pipeline = new NoTradeFilterPipeline(minimumPublishConfidence);
        var blocking = pipeline.EvaluateAll(context, calibratedResult, environment);

        return new SignalGenerationOutcome
        {
            Published = blocking.Count == 0,
            StrategyResult = calibratedResult,
            CalibratedConfidence = calibrated,
            BlockingReasons = blocking
        };
    }
}
