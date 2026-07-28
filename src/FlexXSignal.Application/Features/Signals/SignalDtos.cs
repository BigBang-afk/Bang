using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Signals;

public sealed record SignalScoreDto(
    decimal TrendScore, decimal MarketStructureScore, decimal MomentumScore, decimal CandlePressureScore,
    decimal SupportResistanceScore, decimal BreakoutScore, decimal VolatilityScore, decimal DataQualityScore,
    decimal HistoricalStrategyScore, decimal MultiTimeframeScore, decimal FinalCalibratedConfidence);

public sealed record SignalReasonDto(bool IsSupporting, string Code, string Description, string IndicatorsUsedCsv);

public sealed record SignalResultDto(
    SignalStatus Outcome, decimal EntryPrice, decimal ExpirationPrice,
    DateTime EntryTimestampUtc, DateTime ExpirationTimestampUtc, DateTime VerificationTimestampUtc,
    VerificationMethod VerificationMethod, string DataSourceIdentifier, bool IsLocked);

public sealed record CandleSnapshotPointDto(DateTime TimeUtc, decimal Open, decimal High, decimal Low, decimal Close, decimal Volume);

public sealed record SignalDto(
    Guid Id,
    long TradeNumber,
    string PairSymbol,
    string PairDisplayName,
    PairMarketType MarketType,
    decimal CurrentPayoutPercent,
    SignalDirection Direction,
    SignalStatus Status,
    DateTime SignalCreatedAtUtc,
    DateTime EntryTimeUtc,
    DateTime ExpirationTimeUtc,
    ExpirationDuration Duration,
    Timeframe Timeframe,
    decimal ConfidencePercent,
    string StrategyName,
    int StrategyVersion,
    MarketCondition MarketCondition,
    string AnalysisExplanationEn,
    string AnalysisExplanationUr,
    decimal? EntryPrice,
    decimal? ExpirationPrice,
    string DataSourceName,
    DataQualityStatus DataQuality,
    bool IsDemoData,
    SignalScoreDto? Scores,
    IReadOnlyList<SignalReasonDto> Reasons,
    SignalResultDto? Result,
    IReadOnlyList<CandleSnapshotPointDto> CandleSnapshot);

public sealed record SignalListItemDto(
    Guid Id, long TradeNumber, string PairSymbol, PairMarketType MarketType, SignalDirection Direction,
    SignalStatus Status, DateTime EntryTimeUtc, DateTime ExpirationTimeUtc, decimal ConfidencePercent,
    string StrategyName, MarketCondition MarketCondition, bool IsDemoData);

public sealed record SignalHistoryFilter(
    DateTime? FromUtc, DateTime? ToUtc, string? PairSymbol, PairMarketType? MarketType,
    SignalDirection? Direction, SignalStatus? Result, string? StrategyKey,
    decimal? MinConfidence, decimal? MaxConfidence, ExpirationDuration? Duration,
    MarketCondition? MarketCondition, int Page = 1, int PageSize = 25,
    string SortBy = "EntryTimeUtc", bool SortDescending = true);

public sealed record CreateManualSignalRequest(
    string PairSymbol, SignalDirection Direction, ExpirationDuration Duration, Timeframe Timeframe,
    DateTime EntryTimeUtc, decimal ConfidencePercent, string AnalysisExplanationEn, string? AnalysisExplanationUr,
    Guid StrategyVersionId);

public sealed record CorrectSignalResultRequest(SignalStatus NewOutcome, string Reason);

public sealed record SignalStatisticsDto(
    int TodaySignals, int TodayWins, int TodayLosses, int TodayTies, decimal TodayWinRate,
    decimal Last20WinRate, decimal Last100WinRate, decimal Last500WinRate,
    decimal SevenDayWinRate, decimal ThirtyDayWinRate,
    string? BestPair, string? WorstPair, string? BestStrategy, string? WorstStrategy,
    int MaxLosingStreak, int CurrentStreak, decimal AverageConfidence, decimal DataProviderUptimePercent);

public sealed record ConfidenceBandStatDto(string Band, int TotalSignals, int Wins, decimal RecordedWinRate);
