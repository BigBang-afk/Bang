namespace IslamicCompanionPro.Models.Dto;

/// <summary>In-memory result of a single day's prayer time computation, in local (device/settings) time.</summary>
public class PrayerTimesResult
{
	public DateTime Date { get; set; }
	public DateTime Fajr { get; set; }
	public DateTime Sunrise { get; set; }
	public DateTime Dhuhr { get; set; }
	public DateTime Asr { get; set; }
	public DateTime Maghrib { get; set; }
	public DateTime Isha { get; set; }

	/// <summary>Ordered list for easy binding/iteration in the UI and notification scheduler.</summary>
	public IEnumerable<(Enums.PrayerName Name, DateTime Time)> AsOrderedList()
	{
		yield return (Enums.PrayerName.Fajr, Fajr);
		yield return (Enums.PrayerName.Sunrise, Sunrise);
		yield return (Enums.PrayerName.Dhuhr, Dhuhr);
		yield return (Enums.PrayerName.Asr, Asr);
		yield return (Enums.PrayerName.Maghrib, Maghrib);
		yield return (Enums.PrayerName.Isha, Isha);
	}
}
