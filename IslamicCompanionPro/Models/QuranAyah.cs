using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>A single Ayah of Arabic Quran text.</summary>
[Table("QuranAyahs")]
public class QuranAyah
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public int SurahNumber { get; set; }

	public int AyahNumber { get; set; }

	public string TextArabic { get; set; } = string.Empty;

	/// <summary>Global Ayah index (1-6236) used for audio file lookups and cross-surah search.</summary>
	public int GlobalAyahNumber { get; set; }

	[Indexed]
	public int JuzNumber { get; set; }

	public int PageNumber { get; set; }

	public bool IsSajdahAyah { get; set; }
}
