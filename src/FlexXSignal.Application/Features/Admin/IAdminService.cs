using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Admin;

public interface IAdminService
{
    Task<Result<IReadOnlyList<AdminUserDto>>> GetUsersAsync(string? search, CancellationToken ct = default);
    Task<Result> UpdateUserRolesAsync(Guid userId, UpdateUserRolesRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result> SetUserActiveAsync(Guid userId, SetUserActiveRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<string>>> GetAvailableRolesAsync(CancellationToken ct = default);
    Task<Result<PagedResult<AuditLogDto>>> GetAuditLogsAsync(AuditLogFilter filter, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SystemSettingDto>>> GetSettingsAsync(string? category, CancellationToken ct = default);
    Task<Result> UpdateSettingAsync(UpdateSystemSettingRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<AdminDashboardSummaryDto>> GetDashboardSummaryAsync(CancellationToken ct = default);
}
