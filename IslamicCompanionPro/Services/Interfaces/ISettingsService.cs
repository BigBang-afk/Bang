using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Enums;

namespace IslamicCompanionPro.Services.Interfaces;

public interface ISettingsService
{
	/// <summary>
	/// Fast, synchronous read of the saved theme from Microsoft.Maui.Storage.Preferences (not the
	/// SQLite database) so App.xaml.cs can apply it before the first frame is drawn, without
	/// waiting on database initialization.
	/// </summary>
	AppTheme GetAppTheme();

	Task<AppSettings> GetAppSettingsAsync();
	Task SaveAppSettingsAsync(AppSettings settings);

	Task<PrayerSettings> GetPrayerSettingsAsync();
	Task SavePrayerSettingsAsync(PrayerSettings settings);

	Task ResetAllSettingsAsync();

	/// <summary>Copies the SQLite database file to a user-chosen location via the platform share/save sheet.</summary>
	Task<string> BackupDatabaseAsync();

	/// <summary>Restores the SQLite database file from a previously exported backup file path.</summary>
	Task RestoreDatabaseAsync(string backupFilePath);
}
