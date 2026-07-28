using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class BacktestTrade : BaseEntity
{
    public Guid BacktestId { get; set; }
    public Backtest? Backtest { get; set; }

    public DateTime EntryTimeUtc { get; set; }
    public DateTime ExpirationTimeUtc { get; set; }
    public SignalDirection Direction { get; set; }
    public decimal EntryPrice { get; set; }
    public decimal ExpirationPrice { get; set; }
    public decimal ConfidencePercent { get; set; }
    public MarketCondition MarketCondition { get; set; }
    public SignalStatus Outcome { get; set; }
    public bool IsOutOfSample { get; set; }
    public int WalkForwardFoldIndex { get; set; }
}
