using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Signals;

public interface ISignalService
{
    Task<Result<SignalDto>> GetByIdAsync(Guid signalId, Guid? requestingUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SignalListItemDto>>> GetLiveAndUpcomingAsync(Guid? requestingUserId, CancellationToken ct = default);
    Task<Result<PagedResult<SignalListItemDto>>> GetHistoryAsync(Guid? requestingUserId, SignalHistoryFilter filter, CancellationToken ct = default);
    Task<Result<SignalDto>> CreateManualSignalAsync(CreateManualSignalRequest request, Guid createdByUserId, CancellationToken ct = default);
    Task<Result> CancelSignalAsync(Guid signalId, string reason, Guid canceledByUserId, CancellationToken ct = default);
    Task<Result> CorrectSignalResultAsync(Guid signalId, CorrectSignalResultRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<SignalStatisticsDto>> GetStatisticsAsync(Guid? requestingUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<ConfidenceBandStatDto>>> GetConfidenceCalibrationAsync(CancellationToken ct = default);
    Task<Result<string>> ExportHistoryCsvAsync(Guid? requestingUserId, SignalHistoryFilter filter, CancellationToken ct = default);
}
