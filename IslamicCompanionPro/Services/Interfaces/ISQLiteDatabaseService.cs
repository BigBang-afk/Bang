using SQLite;

namespace IslamicCompanionPro.Services.Interfaces;

/// <summary>
/// Owns the single SQLite connection for the whole app: creates all tables on first run and
/// seeds initial reference data (Surahs, sample Ayahs/translations, Dua categories/Duas, default
/// settings rows). All other services depend on this being initialized before use; MauiProgram
/// awaits <see cref="InitializeAsync"/> during startup.
/// </summary>
public interface ISQLiteDatabaseService
{
	SQLiteAsyncConnection Connection { get; }

	Task InitializeAsync();

	Task<int> InsertAsync<T>(T item) where T : new();
	Task<int> InsertAllAsync<T>(IEnumerable<T> items) where T : new();
	Task<int> UpdateAsync<T>(T item) where T : new();
	Task<int> DeleteAsync<T>(T item) where T : new();
	Task<List<T>> GetAllAsync<T>() where T : new();
	Task<T?> FindAsync<T>(object primaryKey) where T : new();

	/// <summary>Deletes the database file and re-creates/re-seeds it. Used by Settings > Reset app.</summary>
	Task ResetDatabaseAsync();

	/// <summary>Closes the open connection without deleting the file, so it can be safely overwritten (e.g. Restore backup).</summary>
	Task CloseConnectionAsync();

	/// <summary>Exports the raw .db3 file path for Settings > Backup/Restore.</summary>
	string DatabaseFilePath { get; }
}
