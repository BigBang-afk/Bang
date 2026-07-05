using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>Metadata for one of the 114 Surahs. Ayah text lives in <see cref="QuranAyah"/>.</summary>
[Table("QuranSurahs")]
public class QuranSurah
{
	[PrimaryKey]
	public int SurahNumber { get; set; }

	public string NameArabic { get; set; } = string.Empty;

	public string NameEnglish { get; set; } = string.Empty;

	public string NameTransliteration { get; set; } = string.Empty;

	public int AyahCount { get; set; }

	/// <summary>"Meccan" or "Medinan".</summary>
	public string RevelationPlace { get; set; } = string.Empty;

	public int RevelationOrder { get; set; }

	/// <summary>Juz (Para) number in which this Surah starts.</summary>
	public int StartingJuz { get; set; }
}
