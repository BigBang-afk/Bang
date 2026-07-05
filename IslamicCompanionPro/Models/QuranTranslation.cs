using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>Translation of one Ayah into a given language ("en", "ur", ...).</summary>
[Table("QuranTranslations")]
public class QuranTranslation
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public int GlobalAyahNumber { get; set; }

	/// <summary>ISO language code: "en" or "ur". More languages can be added without a schema change.</summary>
	[Indexed]
	public string LanguageCode { get; set; } = "en";

	public string Text { get; set; } = string.Empty;

	/// <summary>Name of the translator/edition, e.g. "Saheeh International", "Kanzul Iman".</summary>
	public string TranslatorName { get; set; } = string.Empty;
}
