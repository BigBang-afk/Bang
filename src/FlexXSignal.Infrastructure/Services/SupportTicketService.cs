using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Support;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class SupportTicketService : ISupportTicketService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;

    public SupportTicketService(AppDbContext db, IDateTimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<Result<SupportTicketDto>> CreateAsync(Guid userId, CreateSupportTicketRequest request, CancellationToken ct = default)
    {
        var ticket = new SupportTicket
        {
            UserId = userId,
            Subject = request.Subject,
            Category = request.Category,
            Priority = request.Priority
        };
        ticket.Messages.Add(new SupportTicketMessage { AuthorUserId = userId, IsFromStaff = false, Message = request.Message });

        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync(ct);

        return Result<SupportTicketDto>.Success(ToDto(ticket));
    }

    public async Task<Result<SupportTicketDto>> GetByIdAsync(Guid ticketId, CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets.AsNoTracking().Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == ticketId, ct);
        return ticket is null ? Result<SupportTicketDto>.Failure("Ticket not found.") : Result<SupportTicketDto>.Success(ToDto(ticket));
    }

    public async Task<Result<IReadOnlyList<SupportTicketListItemDto>>> GetForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var tickets = await _db.SupportTickets.AsNoTracking().Include(t => t.Messages)
            .Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAtUtc).ToListAsync(ct);
        return Result<IReadOnlyList<SupportTicketListItemDto>>.Success(tickets.Select(ToListDto).ToList());
    }

    public async Task<Result<IReadOnlyList<SupportTicketListItemDto>>> GetAllAsync(SupportTicketStatusFilter filter, CancellationToken ct = default)
    {
        var query = _db.SupportTickets.AsNoTracking().Include(t => t.Messages).AsQueryable();
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status);
        if (filter.Priority.HasValue) query = query.Where(t => t.Priority == filter.Priority);
        var tickets = await query.OrderByDescending(t => t.CreatedAtUtc).ToListAsync(ct);
        return Result<IReadOnlyList<SupportTicketListItemDto>>.Success(tickets.Select(ToListDto).ToList());
    }

    public async Task<Result> AddMessageAsync(Guid ticketId, Guid authorUserId, bool isStaff, AddSupportMessageRequest request, CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == ticketId, ct);
        if (ticket is null) return Result.Failure("Ticket not found.");

        _db.SupportTicketMessages.Add(new SupportTicketMessage { SupportTicketId = ticketId, AuthorUserId = authorUserId, IsFromStaff = isStaff, Message = request.Message });
        if (isStaff && ticket.Status == Domain.Enums.SupportTicketStatus.Open) ticket.Status = Domain.Enums.SupportTicketStatus.InProgress;
        ticket.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> UpdateAsync(Guid ticketId, UpdateSupportTicketRequest request, Guid staffUserId, CancellationToken ct = default)
    {
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == ticketId, ct);
        if (ticket is null) return Result.Failure("Ticket not found.");

        if (request.Status.HasValue)
        {
            ticket.Status = request.Status.Value;
            if (request.Status is Domain.Enums.SupportTicketStatus.Resolved or Domain.Enums.SupportTicketStatus.Closed)
                ticket.ClosedAtUtc = _clock.UtcNow;
        }
        if (request.Priority.HasValue) ticket.Priority = request.Priority.Value;
        if (request.AssignedToUserId.HasValue) ticket.AssignedToUserId = request.AssignedToUserId;
        ticket.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static SupportTicketDto ToDto(SupportTicket t) => new(
        t.Id, t.Subject, t.Category, t.Status, t.Priority, t.AssignedToUserId, t.CreatedAtUtc, t.ClosedAtUtc,
        t.Messages.OrderBy(m => m.CreatedAtUtc).Select(m => new SupportMessageDto(m.Id, m.AuthorUserId, m.IsFromStaff, m.Message, m.CreatedAtUtc)).ToList());

    private static SupportTicketListItemDto ToListDto(SupportTicket t) => new(t.Id, t.Subject, t.Category, t.Status, t.Priority, t.CreatedAtUtc, t.Messages.Count);
}
