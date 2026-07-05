using IslamicCompanionPro.Models.Enums;
using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>
/// Single-row table (Id is always 1) holding everything PrayerTimeService and NotificationService
/// need to compute and schedule prayer times offline: location, timezone, calculation method and
/// per-prayer notification preferences.
/// </summary>
[Table("PrayerSettings")]
public class PrayerSettings
{
	[PrimaryKey]
	public int Id { get; set; } = 1;

	public LocationMode LocationMode { get; set; } = LocationMode.AutomaticGps;

	public double Latitude { get; set; }

	public double Longitude { get; set; }

	public string CityName { get; set; } = string.Empty;

	public string CountryName { get; set; } = string.Empty;

	/// <summary>IANA timezone id, e.g. "Asia/Karachi". Used together with lat/lon + date + method.</summary>
	public string TimeZoneId { get; set; } = "UTC";

	public CalculationMethod CalculationMethod { get; set; } = CalculationMethod.MuslimWorldLeague;

	public AsrMethod AsrMethod { get; set; } = AsrMethod.Shafi;

	/// <summary>Only used when CalculationMethod == Custom.</summary>
	public double CustomFajrAngle { get; set; } = 18.0;

	public double CustomIshaAngle { get; set; } = 17.0;

	/// <summary>Some methods (e.g. Umm al-Qura) fix Isha as minutes after Maghrib instead of an angle.</summary>
	public int CustomIshaMinutesAfterMaghrib { get; set; }

	// --- Notification preferences ---

	public bool FajrNotificationEnabled { get; set; } = true;
	public bool SunriseNotificationEnabled { get; set; }
	public bool DhuhrNotificationEnabled { get; set; } = true;
	public bool AsrNotificationEnabled { get; set; } = true;
	public bool MaghribNotificationEnabled { get; set; } = true;
	public bool IshaNotificationEnabled { get; set; } = true;

	/// <summary>Minutes before Azan to fire a reminder notification (0 = no reminder, only Azan itself).</summary>
	public int ReminderMinutesBeforePrayer { get; set; } = 10;

	public AzanSound AzanSound { get; set; } = AzanSound.MakkahAzan;

	public bool SilentNotifications { get; set; }

	public bool JummahReminderEnabled { get; set; } = true;

	/// <summary>Manual whole-day offset applied to the Hijri date derived from the tabular calendar.</summary>
	public int HijriDateAdjustmentDays { get; set; }
}
