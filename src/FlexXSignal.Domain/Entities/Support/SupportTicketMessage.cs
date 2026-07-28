using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class SupportTicketMessage : BaseEntity
{
    public Guid SupportTicketId { get; set; }
    public SupportTicket? SupportTicket { get; set; }
    public Guid AuthorUserId { get; set; }
    public bool IsFromStaff { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
}
