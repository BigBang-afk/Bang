using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

/// <summary>Writes immutable audit trail rows. Deliberately isolated from <see cref="IUnitOfWork.SaveChangesAsync"/>
/// calls made by the caller's own business transaction - a failed audit write should never roll back the
/// business operation it is describing, so this saves independently via its own repository call.</summary>
public class AuditService : IAuditService
{
    private readonly IUnitOfWork _unitOfWork;

    public AuditService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task LogAsync(int? userId, string actionType, string? tableName, string? recordId, string? oldValues, string? newValues, CancellationToken cancellationToken = default)
    {
        var entry = new AuditLog
        {
            UserId = userId,
            ActionType = actionType,
            TableName = tableName,
            RecordId = recordId,
            OldValues = oldValues,
            NewValues = newValues,
            ActionDate = DateTime.Now
        };

        await _unitOfWork.AuditLogs.AddAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await _unitOfWork.AuditLogs.GetRecentAsync(count, cancellationToken);
}
