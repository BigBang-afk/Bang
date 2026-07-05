namespace IslamicCompanionPro.Services.Interfaces;

/// <summary>
/// Named IAzanNotificationService (not INotificationService) to avoid colliding with
/// Plugin.LocalNotification's own INotificationService type, which is in scope wherever that
/// package's namespace is imported.
/// </summary>
public interface IAzanNotificationService
{
	Task<bool> RequestPermissionAsync();

	/// <summary>
	/// Cancels any previously scheduled Azan/reminder notifications and schedules fresh ones for
	/// today (and the Jummah reminder if today is Friday) based on the current PrayerSettings.
	/// Call this on app start, after settings change, and once per day (e.g. from a midnight
	/// re-check) so notifications always reflect the latest location/method/timezone.
	/// </summary>
	Task RescheduleAllAsync();

	Task CancelAllAsync();

	/// <summary>Fires an immediate notification so the user can verify sound/vibration settings.</summary>
	Task ShowTestNotificationAsync();
}
