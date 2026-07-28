using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class StrategyParameter : BaseEntity
{
    public Guid StrategyVersionId { get; set; }
    public StrategyVersion? StrategyVersion { get; set; }
    public string Key { get; set; } = string.Empty; // e.g. "EmaFastPeriod", "RsiOverbought"
    public string Value { get; set; } = string.Empty; // stored as string, parsed by strategy
    public string DataType { get; set; } = "decimal"; // decimal, int, bool, string
    public string? Description { get; set; }
}
