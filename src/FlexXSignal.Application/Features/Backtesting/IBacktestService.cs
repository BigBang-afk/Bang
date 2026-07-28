using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Backtesting;

public interface IBacktestService
{
    Task<Result<Guid>> QueueBacktestAsync(RunBacktestRequest request, Guid userId, CancellationToken ct = default);
    Task<Result<BacktestResultDto>> GetResultAsync(Guid backtestId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<BacktestListItemDto>>> GetHistoryAsync(Guid? userId, CancellationToken ct = default);
    Task<Result<string>> ExportResultCsvAsync(Guid backtestId, CancellationToken ct = default);
    Task RunQueuedBacktestAsync(Guid backtestId, CancellationToken ct = default);
}
