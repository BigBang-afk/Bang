using System.Text.Json;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;

namespace FlexXSignal.Infrastructure.Services;

public sealed class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public AuditLogService(AppDbContext db, ICurrentUserService currentUser, IDateTimeProvider clock)
    {
        _db = db;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task LogAsync(AuditAction action, string entityName, string? entityId, object? oldValue, object? newValue, string? reason, CancellationToken ct = default)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = _currentUser.UserId,
            ActorDisplayName = _currentUser.Email ?? "system",
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            OldValueJson = oldValue is null ? null : JsonSerializer.Serialize(oldValue),
            NewValueJson = newValue is null ? null : JsonSerializer.Serialize(newValue),
            Reason = reason,
            IpAddress = _currentUser.IpAddress,
            OccurredAtUtc = _clock.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }
}
