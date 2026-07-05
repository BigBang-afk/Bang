namespace IslamicCompanionPro.Models.Dto;

public class HijriDate
{
	public int Year { get; set; }
	public int Month { get; set; }
	public int Day { get; set; }

	private static readonly string[] MonthNames =
	{
		"Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
		"Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
		"Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
	};

	public string MonthName => MonthNames[Math.Clamp(Month - 1, 0, 11)];

	public override string ToString() => $"{Day} {MonthName} {Year} AH";
}

/// <summary>A notable Islamic date shown on the Islamic Calendar page.</summary>
public class IslamicEvent
{
	public string Name { get; set; } = string.Empty;
	public int HijriMonth { get; set; }
	public int HijriDay { get; set; }
	public string Description { get; set; } = string.Empty;
}
