using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid? ActorUserId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;
    public AuditAction Action { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public string? Reason { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
