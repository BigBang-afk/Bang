using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>
/// Caches computed prayer times per calendar date so the app can display today's/monthly
/// timings instantly offline without recomputation, and so notifications can be scheduled
/// ahead of time. Cleared/recomputed whenever location, timezone or calculation method changes.
/// </summary>
[Table("PrayerTimesCache")]
public class PrayerTimesCache
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	/// <summary>Gregorian date (date-only) this row applies to.</summary>
	[Indexed(Unique = true)]
	public DateTime Date { get; set; }

	/// <summary>All times stored as UTC ticks-of-day converted on read to the settings' timezone for display.</summary>
	public DateTime FajrUtc { get; set; }
	public DateTime SunriseUtc { get; set; }
	public DateTime DhuhrUtc { get; set; }
	public DateTime AsrUtc { get; set; }
	public DateTime MaghribUtc { get; set; }
	public DateTime IshaUtc { get; set; }

	/// <summary>Hash of (lat, lon, method, asr, timezone) used to detect stale cache rows.</summary>
	public string SettingsHash { get; set; } = string.Empty;
}
