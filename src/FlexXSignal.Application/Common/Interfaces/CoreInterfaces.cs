using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    IReadOnlyList<string> Roles { get; }
    string IpAddress { get; }
    bool IsInRole(string role);
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(ApplicationUser user, IEnumerable<string> roles);
    string GenerateRefreshToken();
    string HashToken(string token);
}

public interface IAuditLogService
{
    Task LogAsync(AuditAction action, string entityName, string? entityId, object? oldValue, object? newValue, string? reason, CancellationToken ct = default);
}

/// <summary>Development-safe payment workflow: no real gateway is called. Approval is a manual admin action.</summary>
public interface IPaymentProvider
{
    string ProviderName { get; }
    Task<Result<Guid>> SubmitPaymentAsync(Guid userId, Guid subscriptionPlanId, decimal amount, string currency, string referenceCode, string? proofOfPaymentUrl, CancellationToken ct = default);
    Task<Result> ApprovePaymentAsync(Guid paymentRecordId, Guid approvedByUserId, string? note, CancellationToken ct = default);
    Task<Result> RejectPaymentAsync(Guid paymentRecordId, Guid rejectedByUserId, string reason, CancellationToken ct = default);
}

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}

public interface ITelegramSender
{
    Task SendAsync(string chatId, string message, CancellationToken ct = default);
}

/// <summary>Abstraction over the real-time push mechanism (SignalR hub) so Application services never
/// depend on ASP.NET Core SignalR types directly.</summary>
public interface ISignalRealtimeNotifier
{
    Task NotifySignalCreatedAsync(Guid signalId, CancellationToken ct = default);
    Task NotifySignalCountdownAsync(Guid signalId, int secondsRemaining, CancellationToken ct = default);
    Task NotifySignalActivatedAsync(Guid signalId, CancellationToken ct = default);
    Task NotifySignalResultAsync(Guid signalId, SignalStatus outcome, CancellationToken ct = default);
    Task NotifyCandleUpdateAsync(Guid tradingPairId, object candle, CancellationToken ct = default);
    Task NotifyProviderHealthAsync(object health, CancellationToken ct = default);
    Task NotifyAnnouncementAsync(Guid announcementId, CancellationToken ct = default);
}
