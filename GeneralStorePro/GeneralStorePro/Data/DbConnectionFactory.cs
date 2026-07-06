using Microsoft.Data.Sqlite;

namespace GeneralStorePro.Data;

/// <summary>
/// Hands out open, ready-to-use connections for repositories (Dapper) to consume.
/// </summary>
public static class DbConnectionFactory
{
    public static SqliteConnection CreateConnection()
    {
        var connection = new SqliteConnection(DatabaseInitializer.ConnectionString);
        connection.Open();

        using var pragma = connection.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_keys = ON;";
        pragma.ExecuteNonQuery();

        return connection;
    }
}
