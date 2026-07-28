using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

/// <summary>Flexible key/value metric store so the backtest report can hold arbitrary
/// breakdowns (by hour, by pair, by confidence range, etc.) without a rigid schema.</summary>
public class BacktestMetric : BaseEntity
{
    public Guid BacktestId { get; set; }
    public Backtest? Backtest { get; set; }
    public string Category { get; set; } = string.Empty; // "Overall","ByHour","ByDay","ByPair","ByDirection","ByStrategy","ByConfidenceRange","ByMarketCondition","Equity","Drawdown"
    public string Key { get; set; } = string.Empty; // e.g. "14", "UP", "80-84"
    public string MetricsJson { get; set; } = "{}"; // { wins, losses, ties, winRate, ... }
}
