using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Admin;

public sealed record AdminUserDto(
    Guid Id, string Email, string DisplayName, bool IsActive, bool EmailConfirmed,
    IReadOnlyList<string> Roles, DateTime CreatedAtUtc, DateTime? LastLoginAtUtc, string? CurrentPlan);

public sealed record UpdateUserRolesRequest(IReadOnlyList<string> Roles);
public sealed record SetUserActiveRequest(bool IsActive);

public sealed record AuditLogDto(
    Guid Id, Guid? ActorUserId, string ActorDisplayName, AuditAction Action, string EntityName, string? EntityId,
    string? OldValueJson, string? NewValueJson, string? Reason, string IpAddress, DateTime OccurredAtUtc);

public sealed record AuditLogFilter(DateTime? FromUtc, DateTime? ToUtc, AuditAction? Action, string? EntityName, Guid? ActorUserId, int Page = 1, int PageSize = 50);

public sealed record SystemSettingDto(string Key, string Value, string Category, string DataType, string? Description, bool IsSecret);
public sealed record UpdateSystemSettingRequest(string Key, string Value);

public sealed record AdminDashboardSummaryDto(
    int TotalUsers, int ActiveSubscriptions, int SignalsToday, decimal TodayWinRate, int PendingPayments,
    int OpenSupportTickets, int ActiveStrategies, ProviderConnectionStatus DataProviderStatus);
