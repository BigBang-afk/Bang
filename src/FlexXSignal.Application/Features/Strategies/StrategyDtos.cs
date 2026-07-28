using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Strategies;

public sealed record StrategyParameterDto(string Key, string Value, string DataType, string? Description);

public sealed record StrategyVersionDto(
    Guid Id, int VersionNumber, bool IsActive, string ChangeNotes,
    decimal WeightTrendAlignment, decimal WeightMarketStructure, decimal WeightCandlePressure, decimal WeightMomentum,
    decimal WeightSupportResistance, decimal WeightBreakoutRejection, decimal WeightMultiTimeframeAgreement,
    decimal WeightVolatilityQuality, decimal WeightHistoricalPerformance, decimal MinimumPublishConfidence,
    IReadOnlyList<StrategyParameterDto> Parameters);

public sealed record StrategyDto(
    Guid Id, string Name, string Key, string Description, StrategyStatus Status,
    int MaxSignalsPerHour, decimal DailyLossLimitPercent, IReadOnlyList<StrategyVersionDto> Versions);

public sealed record CreateStrategyVersionRequest(
    Guid StrategyId, string ChangeNotes,
    decimal WeightTrendAlignment, decimal WeightMarketStructure, decimal WeightCandlePressure, decimal WeightMomentum,
    decimal WeightSupportResistance, decimal WeightBreakoutRejection, decimal WeightMultiTimeframeAgreement,
    decimal WeightVolatilityQuality, decimal WeightHistoricalPerformance, decimal MinimumPublishConfidence,
    IReadOnlyDictionary<string, string> Parameters, bool ActivateImmediately);

public sealed record UpdateStrategyStatusRequest(StrategyStatus Status);

public sealed record StrategyPerformanceDto(
    string StrategyName, int TotalSignals, int Wins, int Losses, int Ties, decimal WinRate, decimal AverageConfidence);
