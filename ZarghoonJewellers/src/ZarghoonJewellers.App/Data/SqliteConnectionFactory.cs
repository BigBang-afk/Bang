using Microsoft.Data.Sqlite;

namespace ZarghoonJewellers.App.Data
{
    /// <summary>Opens a ready-to-use SQLite connection for a repository call. Each call gets its own
    /// short-lived connection, which is the simplest safe pattern for a single-user desktop app.</summary>
    public static class SqliteConnectionFactory
    {
        public static SqliteConnection Create()
        {
            var connection = new SqliteConnection(DatabasePaths.ConnectionString);
            connection.Open();

            using var pragma = connection.CreateCommand();
            pragma.CommandText = "PRAGMA foreign_keys = ON;";
            pragma.ExecuteNonQuery();

            return connection;
        }
    }
}
