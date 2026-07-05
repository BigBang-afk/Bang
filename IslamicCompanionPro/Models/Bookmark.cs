using IslamicCompanionPro.Models.Enums;
using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>
/// Stores the single "last read position" per item type as well as user-created bookmarks.
/// A row with <see cref="IsLastRead"/> = true is upserted every time the user opens an Ayah,
/// so the Home dashboard and Quran page can resume exactly where they left off.
/// </summary>
[Table("Bookmarks")]
public class Bookmark
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public BookmarkItemType ItemType { get; set; }

	/// <summary>GlobalAyahNumber for Ayah bookmarks, or Dua.Id for Dua bookmarks.</summary>
	public int ItemId { get; set; }

	public bool IsLastRead { get; set; }

	public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

	public string? Note { get; set; }
}
