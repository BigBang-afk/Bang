using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

public class SettingsService : ISettingsService
{
	private const string ThemePreferenceKey = "app_theme";
	private const int PrayerSettingsRowId = 1;
	private const int AppSettingsRowId = 1;

	private readonly ISQLiteDatabaseService _db;

	public SettingsService(ISQLiteDatabaseService db)
	{
		_db = db;
	}

	public AppTheme GetAppTheme()
	{
		int stored = Preferences.Default.Get(ThemePreferenceKey, (int)AppTheme.System);
		return (AppTheme)stored;
	}

	public async Task<AppSettings> GetAppSettingsAsync()
	{
		await _db.InitializeAsync();
		return await _db.FindAsync<AppSettings>(AppSettingsRowId) ?? new AppSettings();
	}

	public async Task SaveAppSettingsAsync(AppSettings settings)
	{
		await _db.InitializeAsync();
		settings.Id = AppSettingsRowId;

		var existing = await _db.FindAsync<AppSettings>(AppSettingsRowId);
		if (existing is null)
		{
			await _db.InsertAsync(settings);
		}
		else
		{
			await _db.UpdateAsync(settings);
		}

		// Mirror the theme to Preferences so it's available synchronously on next app launch.
		Preferences.Default.Set(ThemePreferenceKey, (int)settings.Theme);
	}

	public async Task<PrayerSettings> GetPrayerSettingsAsync()
	{
		await _db.InitializeAsync();
		return await _db.FindAsync<PrayerSettings>(PrayerSettingsRowId) ?? new PrayerSettings();
	}

	public async Task SavePrayerSettingsAsync(PrayerSettings settings)
	{
		await _db.InitializeAsync();
		settings.Id = PrayerSettingsRowId;

		var existing = await _db.FindAsync<PrayerSettings>(PrayerSettingsRowId);
		if (existing is null)
		{
			await _db.InsertAsync(settings);
		}
		else
		{
			await _db.UpdateAsync(settings);
		}
	}

	public async Task ResetAllSettingsAsync()
	{
		Preferences.Default.Clear();
		await _db.ResetDatabaseAsync();
	}

	public async Task<string> BackupDatabaseAsync()
	{
		await _db.InitializeAsync();
		string backupFileName = $"islamic_companion_pro_backup_{DateTime.Now:yyyyMMdd_HHmmss}.db3";
		string backupPath = Path.Combine(FileSystem.CacheDirectory, backupFileName);
		File.Copy(_db.DatabaseFilePath, backupPath, overwrite: true);
		return backupPath;
	}

	public async Task RestoreDatabaseAsync(string backupFilePath)
	{
		if (!File.Exists(backupFilePath))
		{
			throw new FileNotFoundException("Backup file not found.", backupFilePath);
		}

		await _db.CloseConnectionAsync(); // release the file handle before overwriting it
		File.Copy(backupFilePath, _db.DatabaseFilePath, overwrite: true);
		await _db.InitializeAsync();
	}
}
