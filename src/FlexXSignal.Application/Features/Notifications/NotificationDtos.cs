using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Notifications;

public sealed record NotificationDto(Guid Id, NotificationType Type, string Title, string Message, Guid? RelatedSignalId, bool IsRead, DateTime CreatedAtUtc);

public sealed record NotificationPreferenceDto(
    bool SoundEnabled, bool BrowserNotificationsEnabled, bool EmailNotificationsEnabled, bool TelegramNotificationsEnabled,
    string? TelegramChatId, decimal MinimumConfidencePercent, IReadOnlyList<Guid> SelectedPairIds,
    bool NotifyUpSignals, bool NotifyDownSignals, bool UpcomingSignalReminder, int UpcomingReminderSecondsBefore);

public sealed record UpdateNotificationPreferenceRequest(
    bool SoundEnabled, bool BrowserNotificationsEnabled, bool EmailNotificationsEnabled, bool TelegramNotificationsEnabled,
    string? TelegramChatId, decimal MinimumConfidencePercent, IReadOnlyList<Guid> SelectedPairIds,
    bool NotifyUpSignals, bool NotifyDownSignals, bool UpcomingSignalReminder, int UpcomingReminderSecondsBefore);

public sealed record AnnouncementDto(Guid Id, string TitleEn, string BodyEn, string? TitleUr, string? BodyUr, string Severity, bool IsPublished, DateTime? PublishAtUtc, DateTime? ExpiresAtUtc);

public sealed record UpsertAnnouncementRequest(string TitleEn, string BodyEn, string? TitleUr, string? BodyUr, string Severity, bool IsPublished, DateTime? PublishAtUtc, DateTime? ExpiresAtUtc);
