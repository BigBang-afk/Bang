using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class LoginHistory : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public DateTime AttemptedAtUtc { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public string? FailureReason { get; set; }
}
