using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>Tracks a downloaded Ayah recitation audio file so playback works fully offline.</summary>
[Table("AudioDownloads")]
public class AudioDownload
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public int GlobalAyahNumber { get; set; }

	public string ReciterId { get; set; } = string.Empty;

	/// <summary>Absolute path on device storage where the .mp3 was saved.</summary>
	public string LocalFilePath { get; set; } = string.Empty;

	public long FileSizeBytes { get; set; }

	public DateTime DownloadedAtUtc { get; set; } = DateTime.UtcNow;
}
