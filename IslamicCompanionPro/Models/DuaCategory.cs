using SQLite;

namespace IslamicCompanionPro.Models;

[Table("DuaCategories")]
public class DuaCategory
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	public string NameEnglish { get; set; } = string.Empty;

	public string NameArabic { get; set; } = string.Empty;

	public string NameUrdu { get; set; } = string.Empty;

	/// <summary>Font-icon glyph or image file name shown on the category tile.</summary>
	public string IconName { get; set; } = string.Empty;

	public int SortOrder { get; set; }
}
