using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Backtesting;

public sealed record RunBacktestRequest(
    string Name, Guid TradingPairId, Timeframe Timeframe, Guid StrategyVersionId, ExpirationDuration Duration,
    DateTime InSampleStartUtc, DateTime InSampleEndUtc, DateTime? OutOfSampleStartUtc, DateTime? OutOfSampleEndUtc,
    bool WalkForwardEnabled, int WalkForwardFolds, decimal ConfidenceThresholdOverride,
    IReadOnlyDictionary<string, string>? ParameterOverrides, Stream? CsvStream, string? CsvFileName);

public sealed record BacktestTradeDto(
    DateTime EntryTimeUtc, DateTime ExpirationTimeUtc, SignalDirection Direction, decimal EntryPrice,
    decimal ExpirationPrice, decimal ConfidencePercent, MarketCondition MarketCondition, SignalStatus Outcome, bool IsOutOfSample);

public sealed record BacktestMetricDto(string Category, string Key, string MetricsJson);

public sealed record BacktestSummaryDto(
    int TotalSignals, int Wins, int Losses, int Ties, int Canceled, decimal WinRate, decimal LossRate,
    decimal AverageConfidence, int MaxWinningStreak, int MaxLosingStreak, decimal MaxDrawdownPercent);

public sealed record BacktestResultDto(
    Guid Id, string Name, BacktestStatus Status, string? ErrorMessage,
    BacktestSummaryDto? Summary, IReadOnlyList<BacktestMetricDto> Metrics, IReadOnlyList<BacktestTradeDto> Trades);

public sealed record BacktestListItemDto(Guid Id, string Name, BacktestStatus Status, DateTime CreatedAtUtc, DateTime? CompletedAtUtc, decimal? WinRate);
