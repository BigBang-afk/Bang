namespace FlexXSignal.SignalEngine.Confidence;

/// <summary>Admin-configurable weights, sourced from StrategyVersion, summing to 100.</summary>
public sealed record ConfidenceWeights
{
    public decimal TrendAlignment { get; init; } = 20m;
    public decimal MarketStructure { get; init; } = 15m;
    public decimal CandlePressure { get; init; } = 15m;
    public decimal Momentum { get; init; } = 10m;
    public decimal SupportResistance { get; init; } = 10m;
    public decimal BreakoutRejection { get; init; } = 10m;
    public decimal MultiTimeframeAgreement { get; init; } = 10m;
    public decimal VolatilityQuality { get; init; } = 5m;
    public decimal HistoricalPerformance { get; init; } = 5m;

    public static readonly ConfidenceWeights Default = new();
}
