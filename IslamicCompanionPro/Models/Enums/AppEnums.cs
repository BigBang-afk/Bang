namespace IslamicCompanionPro.Models.Enums;

/// <summary>
/// Prayer time calculation conventions. Each defines the Fajr/Isha sun angles
/// (or fixed minute offsets) used by PrayerTimeService.
/// </summary>
public enum CalculationMethod
{
	MuslimWorldLeague = 0,
	IslamicSocietyOfNorthAmerica = 1,
	Egyptian = 2,
	UmmAlQura = 3,
	Karachi = 4,
	Custom = 5
}

/// <summary>Determines the shadow-length multiplier used for Asr calculation.</summary>
public enum AsrMethod
{
	Shafi = 0,   // shadow length = 1x object height
	Hanafi = 1   // shadow length = 2x object height
}

public enum LocationMode
{
	AutomaticGps = 0,
	Manual = 1
}

/// <summary>
/// Named AppThemeMode (not AppTheme) to avoid colliding with Microsoft.Maui.ApplicationModel.AppTheme,
/// which is in scope project-wide via MAUI's implicit global usings.
/// </summary>
public enum AppThemeMode
{
	System = 0,
	Light = 1,
	Dark = 2
}

public enum AppLanguage
{
	English = 0,
	Urdu = 1,
	Arabic = 2
}

public enum PrayerName
{
	Fajr = 0,
	Sunrise = 1,
	Dhuhr = 2,
	Asr = 3,
	Maghrib = 4,
	Isha = 5
}

public enum AzanSound
{
	Default = 0,
	MakkahAzan = 1,
	MadinahAzan = 2,
	SilentBeep = 3,
	NoSound = 4
}
