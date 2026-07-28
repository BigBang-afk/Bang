using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// An immutable, versioned snapshot of a strategy's confidence weighting and activation
/// state. Every signal and backtest references the exact StrategyVersion used so results
/// remain reproducible even as an administrator tunes the strategy going forward.
/// </summary>
public class StrategyVersion : BaseEntity
{
    public Guid StrategyId { get; set; }
    public Strategy? Strategy { get; set; }
    public int VersionNumber { get; set; }
    public bool IsActive { get; set; }
    public string ChangeNotes { get; set; } = string.Empty;

    // Weighted confidence scoring (spec default weights, admin-configurable per version)
    public decimal WeightTrendAlignment { get; set; } = 20m;
    public decimal WeightMarketStructure { get; set; } = 15m;
    public decimal WeightCandlePressure { get; set; } = 15m;
    public decimal WeightMomentum { get; set; } = 10m;
    public decimal WeightSupportResistance { get; set; } = 10m;
    public decimal WeightBreakoutRejection { get; set; } = 10m;
    public decimal WeightMultiTimeframeAgreement { get; set; } = 10m;
    public decimal WeightVolatilityQuality { get; set; } = 5m;
    public decimal WeightHistoricalPerformance { get; set; } = 5m;

    public decimal MinimumPublishConfidence { get; set; } = 80m;

    public ICollection<StrategyParameter> Parameters { get; set; } = new List<StrategyParameter>();
}
