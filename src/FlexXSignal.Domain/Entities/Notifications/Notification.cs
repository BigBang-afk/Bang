using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? RelatedSignalId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAtUtc { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.InApp;
    public bool Delivered { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }
}
