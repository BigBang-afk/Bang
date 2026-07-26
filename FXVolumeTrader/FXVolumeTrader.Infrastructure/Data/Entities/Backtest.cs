namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// A single non-repainting backtest run against imported CSV data,
/// with full simulation parameters and aggregate results.
/// </summary>
public class Backtest
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAtUtc { get; set; }

    public DateTime DateRangeStartUtc { get; set; }

    public DateTime DateRangeEndUtc { get; set; }

    public int StrategyConfigurationId { get; set; }

    public StrategyConfiguration? StrategyConfiguration { get; set; }

    public decimal PayoutPercentage { get; set; } = 85m;

    public decimal SpreadPips { get; set; }

    public decimal SlippagePips { get; set; }

    public int SignalDelayMs { get; set; }

    public int ExecutionDelayMs { get; set; }

    public int TotalTrades { get; set; }

    public int Wins { get; set; }

    public int Losses { get; set; }

    public int Draws { get; set; }

    public decimal WinRate { get; set; }

    public decimal NetResult { get; set; }

    public decimal GrossProfit { get; set; }

    public decimal GrossLoss { get; set; }

    public decimal MaxDrawdown { get; set; }

    public decimal ProfitFactor { get; set; }

    public decimal AverageConfidence { get; set; }

    public string? Notes { get; set; }

    public ICollection<BacktestTrade> Trades { get; set; } = new List<BacktestTrade>();
}
