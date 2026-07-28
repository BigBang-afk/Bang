using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Support;

public sealed record SupportMessageDto(Guid Id, Guid AuthorUserId, bool IsFromStaff, string Message, DateTime CreatedAtUtc);

public sealed record SupportTicketDto(
    Guid Id, string Subject, string Category, SupportTicketStatus Status, SupportTicketPriority Priority,
    Guid? AssignedToUserId, DateTime CreatedAtUtc, DateTime? ClosedAtUtc, IReadOnlyList<SupportMessageDto> Messages);

public sealed record SupportTicketListItemDto(Guid Id, string Subject, string Category, SupportTicketStatus Status, SupportTicketPriority Priority, DateTime CreatedAtUtc, int MessageCount);

public sealed record CreateSupportTicketRequest(string Subject, string Category, string Message, SupportTicketPriority Priority);
public sealed record AddSupportMessageRequest(string Message);
public sealed record UpdateSupportTicketRequest(SupportTicketStatus? Status, SupportTicketPriority? Priority, Guid? AssignedToUserId);
