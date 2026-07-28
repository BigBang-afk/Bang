using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class Signal : BaseEntity
{
    public long TradeNumber { get; set; }

    public Guid TradingPairId { get; set; }
    public TradingPair? TradingPair { get; set; }

    public Guid StrategyVersionId { get; set; }
    public StrategyVersion? StrategyVersion { get; set; }

    public Timeframe Timeframe { get; set; }
    public ExpirationDuration Duration { get; set; }

    public SignalDirection Direction { get; set; }
    public SignalStatus Status { get; set; } = SignalStatus.Draft;
    public MarketCondition MarketCondition { get; set; }

    public DateTime SignalCreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime EntryTimeUtc { get; set; }
    public DateTime ExpirationTimeUtc { get; set; }
    public DateTime? ActivatedAtUtc { get; set; }

    public decimal ConfidencePercent { get; set; }
    public decimal PayoutPercentAtCreation { get; set; }

    public string AnalysisExplanationEn { get; set; } = string.Empty;
    public string AnalysisExplanationUr { get; set; } = string.Empty;

    public decimal? EntryPrice { get; set; }
    public decimal? ExpirationPrice { get; set; }

    public string DataSourceName { get; set; } = string.Empty;
    public DataQualityStatus DataQuality { get; set; } = DataQualityStatus.Good;

    public bool IsManual { get; set; }
    public Guid? CreatedByUserId { get; set; }

    public string? CancelReason { get; set; }

    public ICollection<SignalScore> Scores { get; set; } = new List<SignalScore>();
    public ICollection<SignalReason> Reasons { get; set; } = new List<SignalReason>();
    public SignalResult? Result { get; set; }
    public ICollection<SignalSnapshot> Snapshots { get; set; } = new List<SignalSnapshot>();
}
