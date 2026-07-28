using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Support;

public interface ISupportTicketService
{
    Task<Result<SupportTicketDto>> CreateAsync(Guid userId, CreateSupportTicketRequest request, CancellationToken ct = default);
    Task<Result<SupportTicketDto>> GetByIdAsync(Guid ticketId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SupportTicketListItemDto>>> GetForUserAsync(Guid userId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SupportTicketListItemDto>>> GetAllAsync(SupportTicketStatusFilter filter, CancellationToken ct = default);
    Task<Result> AddMessageAsync(Guid ticketId, Guid authorUserId, bool isStaff, AddSupportMessageRequest request, CancellationToken ct = default);
    Task<Result> UpdateAsync(Guid ticketId, UpdateSupportTicketRequest request, Guid staffUserId, CancellationToken ct = default);
}

public sealed record SupportTicketStatusFilter(Domain.Enums.SupportTicketStatus? Status, Domain.Enums.SupportTicketPriority? Priority);
