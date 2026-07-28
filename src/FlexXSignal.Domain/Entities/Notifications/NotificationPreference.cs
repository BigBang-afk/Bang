using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public bool SoundEnabled { get; set; } = true;
    public bool BrowserNotificationsEnabled { get; set; } = true;
    public bool EmailNotificationsEnabled { get; set; }
    public bool TelegramNotificationsEnabled { get; set; }
    public string? TelegramChatId { get; set; }
    public decimal MinimumConfidencePercent { get; set; } = 80m;
    public string SelectedPairIdsCsv { get; set; } = string.Empty; // empty = all allowed pairs
    public bool NotifyUpSignals { get; set; } = true;
    public bool NotifyDownSignals { get; set; } = true;
    public bool UpcomingSignalReminder { get; set; } = true;
    public int UpcomingReminderSecondsBefore { get; set; } = 30;
}
