using FlexXSignal.Application.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Notifications;

public interface INotificationService
{
    Task<Result<IReadOnlyList<NotificationDto>>> GetForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct = default);
    Task<Result> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
    Task<Result> MarkAllReadAsync(Guid userId, CancellationToken ct = default);
    Task<Result<NotificationPreferenceDto>> GetPreferencesAsync(Guid userId, CancellationToken ct = default);
    Task<Result<NotificationPreferenceDto>> UpdatePreferencesAsync(Guid userId, UpdateNotificationPreferenceRequest request, CancellationToken ct = default);
    Task DispatchSignalNotificationAsync(Guid signalId, NotificationType type, CancellationToken ct = default);
    Task<Result<IReadOnlyList<AnnouncementDto>>> GetActiveAnnouncementsAsync(CancellationToken ct = default);
    Task<Result<AnnouncementDto>> UpsertAnnouncementAsync(Guid? announcementId, UpsertAnnouncementRequest request, Guid adminUserId, CancellationToken ct = default);
}
