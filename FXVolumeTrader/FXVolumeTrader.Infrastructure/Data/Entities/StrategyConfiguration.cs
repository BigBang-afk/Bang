namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// A named, versioned, editable strategy parameter set. Only one
/// configuration is IsActive at a time per the strategy settings screen.
/// Seeded with sensible conservative defaults - see SeedData.
/// </summary>
public class StrategyConfiguration
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public required string Version { get; set; }

    public bool IsActive { get; set; }

    public decimal MinRelativeVolume { get; set; } = 1.2m;

    public decimal MinBodyPercentage { get; set; } = 50m;

    public decimal MaxWickPercentage { get; set; } = 40m;

    public int MinConfidence { get; set; } = 65;

    public int EmaFastPeriod { get; set; } = 20;

    public int EmaSlowPeriod { get; set; } = 50;

    public int EmaTrendPeriod { get; set; } = 200;

    public int RsiPeriod { get; set; } = 14;

    public int RsiOverbought { get; set; } = 70;

    public int RsiOversold { get; set; } = 30;

    public int AdxPeriod { get; set; } = 14;

    public decimal AdxThreshold { get; set; } = 20m;

    public decimal SupportResistanceDistancePips { get; set; } = 5m;

    public int SignalCooldownSeconds { get; set; } = 30;

    public decimal MaxSpread { get; set; } = 0.0005m;

    public int MaxFeedDelaySeconds { get; set; } = 5;

    /// <summary>Free-form JSON blob for settings that don't warrant a dedicated column
    /// (allowed sessions/assets/timeframes/expiries).</summary>
    public string? ExtendedParametersJson { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Backtest> Backtests { get; set; } = new List<Backtest>();
}
