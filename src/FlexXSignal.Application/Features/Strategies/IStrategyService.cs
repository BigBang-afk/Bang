using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Strategies;

public interface IStrategyService
{
    Task<Result<IReadOnlyList<StrategyDto>>> GetAllAsync(CancellationToken ct = default);
    Task<Result<StrategyDto>> GetByIdAsync(Guid strategyId, CancellationToken ct = default);
    Task<Result<StrategyVersionDto>> CreateVersionAsync(CreateStrategyVersionRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result> UpdateStatusAsync(Guid strategyId, UpdateStrategyStatusRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result> ActivateVersionAsync(Guid strategyVersionId, Guid adminUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<StrategyPerformanceDto>>> GetPerformanceComparisonAsync(CancellationToken ct = default);
}
