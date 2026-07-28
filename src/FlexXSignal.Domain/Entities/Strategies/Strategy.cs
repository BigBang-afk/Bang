using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class Strategy : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty; // maps to ITradingStrategy implementation key
    public string Description { get; set; } = string.Empty;
    public StrategyStatus Status { get; set; } = StrategyStatus.Disabled;
    public int MaxSignalsPerHour { get; set; } = 4;
    public decimal DailyLossLimitPercent { get; set; } = 100m;
    public int SortOrder { get; set; }

    public ICollection<StrategyVersion> Versions { get; set; } = new List<StrategyVersion>();
}
