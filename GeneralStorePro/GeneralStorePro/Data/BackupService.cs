using Microsoft.Data.Sqlite;

namespace GeneralStorePro.Data;

/// <summary>
/// Uses SQLite's native backup API (not a raw file copy) so backup/restore is safe
/// even while the application holds other connections open.
/// </summary>
public static class BackupService
{
    public static void BackupTo(string destinationPath)
    {
        using var source = new SqliteConnection(DatabaseInitializer.ConnectionString);
        source.Open();

        using var destination = new SqliteConnection($"Data Source={destinationPath}");
        destination.Open();

        source.BackupDatabase(destination);
    }

    public static void RestoreFrom(string sourcePath)
    {
        using var source = new SqliteConnection($"Data Source={sourcePath}");
        source.Open();

        using var destination = new SqliteConnection(DatabaseInitializer.ConnectionString);
        destination.Open();

        source.BackupDatabase(destination);
    }
}
