using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Notifications;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;
    private readonly IEmailSender _emailSender;
    private readonly ITelegramSender _telegramSender;
    private readonly ISignalRealtimeNotifier _realtime;

    public NotificationService(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog, IEmailSender emailSender, ITelegramSender telegramSender, ISignalRealtimeNotifier realtime)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
        _emailSender = emailSender;
        _telegramSender = telegramSender;
        _realtime = realtime;
    }

    public async Task<Result<IReadOnlyList<NotificationDto>>> GetForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct = default)
    {
        var query = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) query = query.Where(n => !n.IsRead);
        var items = await query.OrderByDescending(n => n.CreatedAtUtc).Take(100).ToListAsync(ct);
        return Result<IReadOnlyList<NotificationDto>>.Success(items.Select(n =>
            new NotificationDto(n.Id, n.Type, n.Title, n.Message, n.RelatedSignalId, n.IsRead, n.CreatedAtUtc)).ToList());
    }

    public async Task<Result> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, ct);
        if (n is null) return Result.Failure("Notification not found.");
        n.IsRead = true;
        n.ReadAtUtc = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ForEachAsync(n => { n.IsRead = true; n.ReadAtUtc = _clock.UtcNow; }, ct);
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result<NotificationPreferenceDto>> GetPreferencesAsync(Guid userId, CancellationToken ct = default)
    {
        var pref = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (pref is null)
        {
            pref = new NotificationPreference { UserId = userId };
            _db.NotificationPreferences.Add(pref);
            await _db.SaveChangesAsync(ct);
        }
        return Result<NotificationPreferenceDto>.Success(ToDto(pref));
    }

    public async Task<Result<NotificationPreferenceDto>> UpdatePreferencesAsync(Guid userId, UpdateNotificationPreferenceRequest request, CancellationToken ct = default)
    {
        var pref = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (pref is null)
        {
            pref = new NotificationPreference { UserId = userId };
            _db.NotificationPreferences.Add(pref);
        }

        pref.SoundEnabled = request.SoundEnabled;
        pref.BrowserNotificationsEnabled = request.BrowserNotificationsEnabled;
        pref.EmailNotificationsEnabled = request.EmailNotificationsEnabled;
        pref.TelegramNotificationsEnabled = request.TelegramNotificationsEnabled;
        pref.TelegramChatId = request.TelegramChatId;
        pref.MinimumConfidencePercent = request.MinimumConfidencePercent;
        pref.SelectedPairIdsCsv = string.Join(',', request.SelectedPairIds);
        pref.NotifyUpSignals = request.NotifyUpSignals;
        pref.NotifyDownSignals = request.NotifyDownSignals;
        pref.UpcomingSignalReminder = request.UpcomingSignalReminder;
        pref.UpcomingReminderSecondsBefore = request.UpcomingReminderSecondsBefore;
        pref.UpdatedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Result<NotificationPreferenceDto>.Success(ToDto(pref));
    }

    public async Task DispatchSignalNotificationAsync(Guid signalId, NotificationType type, CancellationToken ct = default)
    {
        var signal = await _db.Signals.AsNoTracking().Include(s => s.TradingPair).FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is null) return;

        var preferences = await _db.NotificationPreferences.AsNoTracking()
            .Where(p => p.MinimumConfidencePercent <= signal.ConfidencePercent)
            .Where(p => (signal.Direction == SignalDirection.Up && p.NotifyUpSignals) || (signal.Direction == SignalDirection.Down && p.NotifyDownSignals))
            .ToListAsync(ct);

        foreach (var pref in preferences)
        {
            if (!string.IsNullOrWhiteSpace(pref.SelectedPairIdsCsv))
            {
                var allowedIds = pref.SelectedPairIdsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (!allowedIds.Contains(signal.TradingPairId.ToString())) continue;
            }

            var title = type switch
            {
                NotificationType.SignalCreated => $"New {signal.Direction} signal: {signal.TradingPair!.DisplayName}",
                NotificationType.SignalActivated => $"Signal active: {signal.TradingPair!.DisplayName}",
                NotificationType.SignalResult => $"Signal result: {signal.TradingPair!.DisplayName}",
                _ => "FlexX Signal notification"
            };
            var message = $"{signal.Direction} · {signal.ConfidencePercent:F0}% confidence · entry {signal.EntryTimeUtc:HH:mm} UTC";

            _db.Notifications.Add(new Notification
            {
                UserId = pref.UserId,
                Type = type,
                Title = title,
                Message = message,
                RelatedSignalId = signalId,
                Channel = NotificationChannel.InApp
            });

            if (pref.EmailNotificationsEnabled)
            {
                var user = await _db.Users.FindAsync([pref.UserId], ct);
                if (user?.Email is not null) await _emailSender.SendAsync(user.Email, title, message, ct);
            }
            if (pref.TelegramNotificationsEnabled && !string.IsNullOrEmpty(pref.TelegramChatId))
            {
                await _telegramSender.SendAsync(pref.TelegramChatId, $"{title}\n{message}", ct);
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<Result<IReadOnlyList<AnnouncementDto>>> GetActiveAnnouncementsAsync(CancellationToken ct = default)
    {
        var now = _clock.UtcNow;
        var announcements = await _db.Announcements.AsNoTracking()
            .Where(a => a.IsPublished && (a.PublishAtUtc == null || a.PublishAtUtc <= now) && (a.ExpiresAtUtc == null || a.ExpiresAtUtc > now))
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(ct);

        return Result<IReadOnlyList<AnnouncementDto>>.Success(announcements.Select(a =>
            new AnnouncementDto(a.Id, a.TitleEn, a.BodyEn, a.TitleUr, a.BodyUr, a.Severity, a.IsPublished, a.PublishAtUtc, a.ExpiresAtUtc)).ToList());
    }

    public async Task<Result<AnnouncementDto>> UpsertAnnouncementAsync(Guid? announcementId, UpsertAnnouncementRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var announcement = announcementId.HasValue ? await _db.Announcements.FirstOrDefaultAsync(a => a.Id == announcementId, ct) : null;
        var isNew = announcement is null;
        announcement ??= new Announcement { CreatedByUserId = adminUserId };

        announcement.TitleEn = request.TitleEn;
        announcement.BodyEn = request.BodyEn;
        announcement.TitleUr = request.TitleUr;
        announcement.BodyUr = request.BodyUr;
        announcement.Severity = request.Severity;
        announcement.IsPublished = request.IsPublished;
        announcement.PublishAtUtc = request.PublishAtUtc;
        announcement.ExpiresAtUtc = request.ExpiresAtUtc;
        announcement.UpdatedAtUtc = _clock.UtcNow;

        if (isNew) _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(isNew ? AuditAction.Create : AuditAction.Update, nameof(Announcement), announcement.Id.ToString(), null, new { announcement.TitleEn, announcement.IsPublished }, null, ct);
        if (announcement.IsPublished) await _realtime.NotifyAnnouncementAsync(announcement.Id, ct);

        return Result<AnnouncementDto>.Success(new AnnouncementDto(announcement.Id, announcement.TitleEn, announcement.BodyEn, announcement.TitleUr, announcement.BodyUr, announcement.Severity, announcement.IsPublished, announcement.PublishAtUtc, announcement.ExpiresAtUtc));
    }

    private static NotificationPreferenceDto ToDto(NotificationPreference p) => new(
        p.SoundEnabled, p.BrowserNotificationsEnabled, p.EmailNotificationsEnabled, p.TelegramNotificationsEnabled,
        p.TelegramChatId, p.MinimumConfidencePercent,
        p.SelectedPairIdsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(Guid.Parse).ToList(),
        p.NotifyUpSignals, p.NotifyDownSignals, p.UpcomingSignalReminder, p.UpcomingReminderSecondsBefore);
}
