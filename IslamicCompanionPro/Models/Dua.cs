using SQLite;

namespace IslamicCompanionPro.Models;

[Table("Duas")]
public class Dua
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public int CategoryId { get; set; }

	public string Title { get; set; } = string.Empty;

	public string TextArabic { get; set; } = string.Empty;

	public string Transliteration { get; set; } = string.Empty;

	public string TranslationEnglish { get; set; } = string.Empty;

	public string TranslationUrdu { get; set; } = string.Empty;

	/// <summary>Authentic source reference, e.g. "Sahih al-Bukhari 6320" or "Hisnul Muslim 45".</summary>
	public string Reference { get; set; } = string.Empty;

	public int SortOrder { get; set; }
}
