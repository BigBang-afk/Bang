using System;
using System.IO;
using System.Reflection;
using GeneralStorePro.Helpers;
using Microsoft.Data.Sqlite;

namespace GeneralStorePro.Data;

/// <summary>
/// Creates the SQLite database file (if missing), applies the schema and seeds first-run data.
/// Safe to call every application startup.
/// </summary>
public static class DatabaseInitializer
{
    private static readonly string DatabaseDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "GeneralStorePro");

    public static string DatabasePath => Path.Combine(DatabaseDirectory, "store.db");

    public static string ConnectionString => $"Data Source={DatabasePath}";

    public static void Initialize()
    {
        Directory.CreateDirectory(DatabaseDirectory);

        using var connection = new SqliteConnection(ConnectionString);
        connection.Open();

        using (var pragma = connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = ON;";
            pragma.ExecuteNonQuery();
        }

        using (var schema = connection.CreateCommand())
        {
            schema.CommandText = LoadSchemaScript();
            schema.ExecuteNonQuery();
        }

        SeedDefaultData(connection);
    }

    private static string LoadSchemaScript()
    {
        const string resourceName = "GeneralStorePro.Data.Schema.sql";
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{resourceName}' was not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static void SeedDefaultData(SqliteConnection connection)
    {
        using (var checkUsers = connection.CreateCommand())
        {
            checkUsers.CommandText = "SELECT COUNT(*) FROM Users;";
            var userCount = (long)checkUsers.ExecuteScalar()!;

            if (userCount == 0)
            {
                using var seedAdmin = connection.CreateCommand();
                seedAdmin.CommandText = """
                    INSERT INTO Users (Username, PasswordHash, FullName, Role)
                    VALUES ($username, $passwordHash, $fullName, $role);
                    """;
                seedAdmin.Parameters.AddWithValue("$username", "admin");
                seedAdmin.Parameters.AddWithValue("$passwordHash", PasswordHasher.Hash("admin123"));
                seedAdmin.Parameters.AddWithValue("$fullName", "Administrator");
                seedAdmin.Parameters.AddWithValue("$role", "Admin");
                seedAdmin.ExecuteNonQuery();
            }
        }

        using (var checkSettings = connection.CreateCommand())
        {
            checkSettings.CommandText = "SELECT COUNT(*) FROM Settings;";
            var settingsCount = (long)checkSettings.ExecuteScalar()!;

            if (settingsCount == 0)
            {
                (string Key, string Value)[] defaults =
                [
                    ("StoreName", "My General Store"),
                    ("StoreAddress", ""),
                    ("StorePhone", ""),
                    ("CurrencySymbol", "$"),
                    ("TaxRatePercent", "0"),
                    ("InvoicePrefix", "INV-"),
                    ("PurchasePrefix", "PUR-"),
                    ("LowStockThreshold", "5"),
                    ("LastBackupDate", "")
                ];

                foreach (var (key, value) in defaults)
                {
                    using var seedSetting = connection.CreateCommand();
                    seedSetting.CommandText = "INSERT INTO Settings (SettingKey, SettingValue) VALUES ($key, $value);";
                    seedSetting.Parameters.AddWithValue("$key", key);
                    seedSetting.Parameters.AddWithValue("$value", value);
                    seedSetting.ExecuteNonQuery();
                }
            }
        }
    }
}
