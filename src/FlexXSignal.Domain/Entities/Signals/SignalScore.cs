using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// Individual weighted score components that make up a signal's final calibrated confidence.
/// </summary>
public class SignalScore : BaseEntity
{
    public Guid SignalId { get; set; }
    public Signal? Signal { get; set; }

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
    public decimal FinalCalibratedConfidence { get; set; }
}
