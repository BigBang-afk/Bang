using IslamicCompanionPro.Models.Enums;
using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>Single-row table (Id is always 1) for general, non-prayer app preferences.</summary>
[Table("AppSettings")]
public class AppSettings
{
	[PrimaryKey]
	public int Id { get; set; } = 1;

	public AppLanguage Language { get; set; } = AppLanguage.English;

	public AppThemeMode Theme { get; set; } = AppThemeMode.System;

	public double QuranFontSize { get; set; } = 26;

	public double DuaFontSize { get; set; } = 20;

	/// <summary>Name of the installed Arabic Uthmani font family to render Quran text with.</summary>
	public string ArabicFontFamily { get; set; } = "Amiri";

	/// <summary>Preferred translation language shown under each Ayah: "en", "ur", or "none".</summary>
	public string PreferredTranslationLanguage { get; set; } = "en";

	public bool TasbeehVibrationEnabled { get; set; } = true;

	public bool TasbeehSoundEnabled { get; set; }

	public bool HasCompletedOnboarding { get; set; }

	public bool AudioAutoDownloadOnWifiOnly { get; set; } = true;

	/// <summary>Reciter identifier used by AudioService when downloading/streaming recitation.</summary>
	public string SelectedReciterId { get; set; } = "mishary_alafasy";
}
