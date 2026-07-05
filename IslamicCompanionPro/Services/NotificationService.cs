using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;
using Plugin.LocalNotification;

namespace IslamicCompanionPro.Services;

/// <summary>
/// Schedules local Azan + reminder notifications using Plugin.LocalNotification. Notification IDs
/// are fixed per prayer slot (see <see cref="NotificationIds"/>) so re-scheduling simply cancels and
/// re-adds the same IDs rather than accumulating duplicates.
///
/// Platform note: neither Android nor iOS guarantees a local notification scheduled "for today"
/// will silently roll over and reschedule itself for tomorrow — call RescheduleAllAsync once per
/// app foreground/resume (already wired in App.xaml.cs) and consider adding an Android
/// WorkManager job / iOS BGTaskScheduler background refresh task for users who don't reopen the
/// app daily.
/// </summary>
public class NotificationService : INotificationService
{
	private static class NotificationIds
	{
		public const int Fajr = 1, Sunrise = 2, Dhuhr = 3, Asr = 4, Maghrib = 5, Isha = 6;
		public const int ReminderOffset = 100; // Fajr reminder = 101, Dhuhr reminder = 103, ...
		public const int Jummah = 200;
		public const int Test = 999;
	}

	private readonly IPrayerTimeService _prayerTimeService;
	private readonly ISettingsService _settingsService;

	public NotificationService(IPrayerTimeService prayerTimeService, ISettingsService settingsService)
	{
		_prayerTimeService = prayerTimeService;
		_settingsService = settingsService;
	}

	public async Task<bool> RequestPermissionAsync()
	{
		return await LocalNotificationCenter.Current.RequestNotificationPermission();
	}

	public async Task RescheduleAllAsync()
	{
		if (!await RequestPermissionAsync())
		{
			return;
		}

		await CancelAllAsync();

		var settings = await _settingsService.GetPrayerSettingsAsync();
		var today = await _prayerTimeService.GetTodayAsync();

		await ScheduleIfEnabled(NotificationIds.Fajr, "Fajr", today.Fajr, settings.FajrNotificationEnabled, settings);
		await ScheduleIfEnabled(NotificationIds.Sunrise, "Sunrise", today.Sunrise, settings.SunriseNotificationEnabled, settings);
		await ScheduleIfEnabled(NotificationIds.Dhuhr, "Dhuhr", today.Dhuhr, settings.DhuhrNotificationEnabled, settings);
		await ScheduleIfEnabled(NotificationIds.Asr, "Asr", today.Asr, settings.AsrNotificationEnabled, settings);
		await ScheduleIfEnabled(NotificationIds.Maghrib, "Maghrib", today.Maghrib, settings.MaghribNotificationEnabled, settings);
		await ScheduleIfEnabled(NotificationIds.Isha, "Isha", today.Isha, settings.IshaNotificationEnabled, settings);

		if (settings.JummahReminderEnabled && DateTime.Today.DayOfWeek == DayOfWeek.Friday)
		{
			await ScheduleNotification(NotificationIds.Jummah, "Jumu'ah Mubarak",
				"Don't forget to prepare early for the Jumu'ah prayer today.", today.Dhuhr.AddHours(-1), settings.SilentNotifications);
		}
	}

	private async Task ScheduleIfEnabled(int id, string prayerName, DateTime prayerTime, bool enabled, Models.PrayerSettings settings)
	{
		if (!enabled || prayerTime <= DateTime.Now)
		{
			return;
		}

		await ScheduleNotification(id, $"{prayerName} Azan", $"It is time for {prayerName} prayer.", prayerTime, settings.SilentNotifications);

		if (settings.ReminderMinutesBeforePrayer > 0 && prayerName is not ("Sunrise"))
		{
			var reminderTime = prayerTime.AddMinutes(-settings.ReminderMinutesBeforePrayer);
			if (reminderTime > DateTime.Now)
			{
				await ScheduleNotification(id + NotificationIds.ReminderOffset, $"{prayerName} soon",
					$"{prayerName} prayer is in {settings.ReminderMinutesBeforePrayer} minutes.", reminderTime, settings.SilentNotifications);
			}
		}
	}

	private static Task ScheduleNotification(int id, string title, string message, DateTime notifyTime, bool silent)
	{
		var request = new NotificationRequest
		{
			NotificationId = id,
			Title = title,
			Description = message,
			Silent = silent,
			Schedule = new NotificationRequestSchedule
			{
				NotifyTime = notifyTime
			}
		};

		return LocalNotificationCenter.Current.Show(request);
	}

	public Task CancelAllAsync()
	{
		int[] ids =
		{
			NotificationIds.Fajr, NotificationIds.Sunrise, NotificationIds.Dhuhr, NotificationIds.Asr, NotificationIds.Maghrib, NotificationIds.Isha,
			NotificationIds.Fajr + NotificationIds.ReminderOffset, NotificationIds.Dhuhr + NotificationIds.ReminderOffset,
			NotificationIds.Asr + NotificationIds.ReminderOffset, NotificationIds.Maghrib + NotificationIds.ReminderOffset,
			NotificationIds.Isha + NotificationIds.ReminderOffset, NotificationIds.Jummah
		};

		LocalNotificationCenter.Current.Cancel(ids);
		return Task.CompletedTask;
	}

	public Task ShowTestNotificationAsync()
	{
		return ScheduleNotification(NotificationIds.Test, "Test Notification",
			"This is what your Azan notifications will look and sound like.", DateTime.Now.AddSeconds(2), silent: false);
	}
}
