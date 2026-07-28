using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class Backtest : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid TradingPairId { get; set; }
    public TradingPair? TradingPair { get; set; }
    public Timeframe Timeframe { get; set; }
    public Guid StrategyVersionId { get; set; }
    public StrategyVersion? StrategyVersion { get; set; }
    public ExpirationDuration Duration { get; set; }

    public DateTime InSampleStartUtc { get; set; }
    public DateTime InSampleEndUtc { get; set; }
    public DateTime? OutOfSampleStartUtc { get; set; }
    public DateTime? OutOfSampleEndUtc { get; set; }
    public bool WalkForwardEnabled { get; set; }
    public int WalkForwardFolds { get; set; } = 1;

    public decimal ConfidenceThresholdOverride { get; set; }
    /// <summary>Exact JSON-serialized strategy parameters used, frozen for reproducibility.</summary>
    public string StrategySettingsSnapshotJson { get; set; } = "{}";
    public string SourceCsvFileName { get; set; } = string.Empty;

    public BacktestStatus Status { get; set; } = BacktestStatus.Queued;
    public string? ErrorMessage { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public ICollection<BacktestTrade> Trades { get; set; } = new List<BacktestTrade>();
    public ICollection<BacktestMetric> Metrics { get; set; } = new List<BacktestMetric>();
}
