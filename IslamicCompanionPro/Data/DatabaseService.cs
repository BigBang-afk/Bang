using IslamicCompanionPro.Data.SeedData;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;
using SQLite;

namespace IslamicCompanionPro.Data;

public class DatabaseService : ISQLiteDatabaseService
{
	private const string DatabaseFileName = "islamic_companion_pro.db3";

	private SQLiteAsyncConnection? _connection;
	private bool _isInitialized;
	private readonly SemaphoreSlim _initLock = new(1, 1);

	public string DatabaseFilePath => Path.Combine(FileSystem.AppDataDirectory, DatabaseFileName);

	public SQLiteAsyncConnection Connection =>
		_connection ?? throw new InvalidOperationException($"{nameof(DatabaseService)}.{nameof(InitializeAsync)} must be called before use.");

	public async Task InitializeAsync()
	{
		if (_isInitialized)
		{
			return;
		}

		await _initLock.WaitAsync();
		try
		{
			if (_isInitialized)
			{
				return;
			}

			_connection = new SQLiteAsyncConnection(DatabaseFilePath,
				SQLiteOpenFlags.ReadWrite | SQLiteOpenFlags.Create | SQLiteOpenFlags.SharedCache);

			await CreateTablesAsync();
			await SeedDatabaseIfEmptyAsync();

			_isInitialized = true;
		}
		finally
		{
			_initLock.Release();
		}
	}

	private async Task CreateTablesAsync()
	{
		await Connection.CreateTableAsync<QuranSurah>();
		await Connection.CreateTableAsync<QuranAyah>();
		await Connection.CreateTableAsync<QuranTranslation>();
		await Connection.CreateTableAsync<DuaCategory>();
		await Connection.CreateTableAsync<Dua>();
		await Connection.CreateTableAsync<Bookmark>();
		await Connection.CreateTableAsync<Favorite>();
		await Connection.CreateTableAsync<PrayerSettings>();
		await Connection.CreateTableAsync<PrayerTimesCache>();
		await Connection.CreateTableAsync<TasbeehRecord>();
		await Connection.CreateTableAsync<AppSettings>();
		await Connection.CreateTableAsync<AudioDownload>();
	}

	private async Task SeedDatabaseIfEmptyAsync()
	{
		// Surahs
		if (await Connection.Table<QuranSurah>().CountAsync() == 0)
		{
			await Connection.InsertAllAsync(SurahSeedData.All);
		}

		// Ayahs + translations
		if (await Connection.Table<QuranAyah>().CountAsync() == 0)
		{
			await Connection.InsertAllAsync(AyahSeedData.Ayahs);
			await Connection.InsertAllAsync(AyahSeedData.TranslationsEnglish);
			await Connection.InsertAllAsync(AyahSeedData.TranslationsUrdu);
		}

		// Dua categories + Duas (categories MUST be inserted first so AutoIncrement ids 1-10
		// line up with the fixed CategoryId values used in DuaSeedData.Duas).
		if (await Connection.Table<DuaCategory>().CountAsync() == 0)
		{
			await Connection.InsertAllAsync(DuaSeedData.Categories);
			await Connection.InsertAllAsync(DuaSeedData.Duas);
		}

		// Default single-row settings
		if (await Connection.Table<PrayerSettings>().CountAsync() == 0)
		{
			await Connection.InsertAsync(new PrayerSettings());
		}

		if (await Connection.Table<AppSettings>().CountAsync() == 0)
		{
			await Connection.InsertAsync(new AppSettings());
		}

		// Default Tasbeeh presets for today so the Tasbeeh page has rows to display/increment
		if (await Connection.Table<TasbeehRecord>().CountAsync() == 0)
		{
			string[] presets = { "SubhanAllah", "Alhamdulillah", "Allahu Akbar", "Astaghfirullah", "La ilaha illallah" };
			var today = DateTime.Today;
			var records = presets.Select(name => new TasbeehRecord
			{
				ZikrName = name,
				Count = 0,
				DailyTarget = 33,
				Date = today,
				IsCustom = false
			});
			await Connection.InsertAllAsync(records);
		}
	}

	public Task<int> InsertAsync<T>(T item) where T : new() => Connection.InsertAsync(item);

	public Task<int> InsertAllAsync<T>(IEnumerable<T> items) where T : new() => Connection.InsertAllAsync(items);

	public Task<int> UpdateAsync<T>(T item) where T : new() => Connection.UpdateAsync(item);

	public Task<int> DeleteAsync<T>(T item) where T : new() => Connection.DeleteAsync(item);

	public Task<List<T>> GetAllAsync<T>() where T : new() => Connection.Table<T>().ToListAsync();

	public async Task<T?> FindAsync<T>(object primaryKey) where T : new()
	{
		try
		{
			return await Connection.FindAsync<T>(primaryKey);
		}
		catch (InvalidOperationException)
		{
			return default;
		}
	}

	public async Task ResetDatabaseAsync()
	{
		await CloseConnectionAsync();

		if (File.Exists(DatabaseFilePath))
		{
			File.Delete(DatabaseFilePath);
		}

		await InitializeAsync();
	}

	public async Task CloseConnectionAsync()
	{
		await _initLock.WaitAsync();
		try
		{
			if (_connection is not null)
			{
				await _connection.CloseAsync();
				_connection = null;
			}

			_isInitialized = false;
		}
		finally
		{
			_initLock.Release();
		}
	}
}
