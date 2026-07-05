using IslamicCompanionPro.Models.Enums;
using SQLite;

namespace IslamicCompanionPro.Models;

[Table("Favorites")]
public class Favorite
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public BookmarkItemType ItemType { get; set; }

	/// <summary>GlobalAyahNumber for Ayah favorites, or Dua.Id for Dua favorites.</summary>
	public int ItemId { get; set; }

	public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
