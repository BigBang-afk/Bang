using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Confidence;

/// <summary>
/// Confidence is never a random percentage: it is a deterministic weighted sum of the
/// nine 0-100 score components, each multiplied by its configurable weight (which sum to 100).
/// </summary>
public static class ConfidenceCalculator
{
    public static decimal CalculateRawConfidence(ScoreBreakdown scores, ConfidenceWeights weights)
    {
        var total =
            scores.TrendScore / 100m * weights.TrendAlignment +
            scores.MarketStructureScore / 100m * weights.MarketStructure +
            scores.CandlePressureScore / 100m * weights.CandlePressure +
            scores.MomentumScore / 100m * weights.Momentum +
            scores.SupportResistanceScore / 100m * weights.SupportResistance +
            scores.BreakoutScore / 100m * weights.BreakoutRejection +
            scores.MultiTimeframeScore / 100m * weights.MultiTimeframeAgreement +
            scores.VolatilityScore / 100m * weights.VolatilityQuality +
            scores.HistoricalStrategyScore / 100m * weights.HistoricalPerformance;

        return Math.Clamp(Math.Round(total, 2), 0, 100);
    }

    /// <summary>The 6 standard calibration buckets used to report actual recorded win rate per confidence band.</summary>
    public static readonly (decimal Min, decimal Max, string Label)[] CalibrationBands =
    {
        (70, 74.999m, "70-74"),
        (75, 79.999m, "75-79"),
        (80, 84.999m, "80-84"),
        (85, 89.999m, "85-89"),
        (90, 94.999m, "90-94"),
        (95, 100m, "95-100")
    };

    public static string BandForConfidence(decimal confidence) =>
        CalibrationBands.FirstOrDefault(b => confidence >= b.Min && confidence <= b.Max).Label
        ?? (confidence < 70 ? "<70" : "95-100");

    /// <summary>
    /// Applies a light historical-calibration nudge: if the recorded win rate for this
    /// confidence band diverges materially from the band's own midpoint, the confidence is
    /// pulled part-way toward the observed reality so displayed confidence tracks actual performance
    /// over time instead of drifting from it. Falls back to the raw score when no history exists yet.
    /// </summary>
    public static decimal Calibrate(decimal rawConfidence, decimal? bandRecordedWinRate, decimal calibrationStrength = 0.25m)
    {
        if (bandRecordedWinRate is null) return rawConfidence;
        var pulled = rawConfidence + (bandRecordedWinRate.Value - rawConfidence) * calibrationStrength;
        return Math.Clamp(Math.Round(pulled, 2), 0, 100);
    }
}
