using Microsoft.Data.Sqlite;

namespace ZarghoonJewellers.App.Data
{
    /// <summary>Creates the SQLite database file and schema on first run, and seeds default settings.</summary>
    public static class DatabaseInitializer
    {
        public static void Initialize()
        {
            using var connection = new SqliteConnection(DatabasePaths.ConnectionString);
            connection.Open();

            using (var pragma = connection.CreateCommand())
            {
                pragma.CommandText = "PRAGMA foreign_keys = ON;";
                pragma.ExecuteNonQuery();
            }

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS Karigars (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    Name        TEXT NOT NULL,
    Mobile      TEXT,
    Address     TEXT,
    Notes       TEXT,
    CreatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CashTransactions (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    Date        TEXT NOT NULL,
    Type        TEXT NOT NULL CHECK (Type IN ('In','Out')),
    KarigarId   INTEGER NULL REFERENCES Karigars(Id) ON DELETE SET NULL,
    PersonName  TEXT,
    Description TEXT,
    Amount      REAL NOT NULL DEFAULT 0,
    Notes       TEXT,
    CreatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS GoldTransactions (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    Date        TEXT NOT NULL,
    Type        TEXT NOT NULL CHECK (Type IN ('In','Out')),
    KarigarId   INTEGER NULL REFERENCES Karigars(Id) ON DELETE SET NULL,
    PersonName  TEXT,
    Weight      REAL NOT NULL DEFAULT 0,
    Purity      TEXT,
    Description TEXT,
    Notes       TEXT,
    CreatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Settings (
    Key   TEXT PRIMARY KEY,
    Value TEXT
);

CREATE INDEX IF NOT EXISTS IX_CashTransactions_Date      ON CashTransactions(Date);
CREATE INDEX IF NOT EXISTS IX_CashTransactions_KarigarId  ON CashTransactions(KarigarId);
CREATE INDEX IF NOT EXISTS IX_GoldTransactions_Date       ON GoldTransactions(Date);
CREATE INDEX IF NOT EXISTS IX_GoldTransactions_KarigarId  ON GoldTransactions(KarigarId);
";
                cmd.ExecuteNonQuery();
            }

            SeedDefaultSettings(connection);
        }

        private static void SeedDefaultSettings(SqliteConnection connection)
        {
            var defaults = new (string Key, string Value)[]
            {
                ("ShopName", "ZARGHOON JEWELLERS"),
                ("ShopAddress", ""),
                ("PhoneNumber", ""),
                ("ReportHeader", "Zarghoon Jewellers - Account & Ledger Report"),
                ("ReportFooter", "Thank you for your business."),
            };

            foreach (var (key, value) in defaults)
            {
                using var cmd = connection.CreateCommand();
                cmd.CommandText = "INSERT OR IGNORE INTO Settings (Key, Value) VALUES ($key, $value);";
                cmd.Parameters.AddWithValue("$key", key);
                cmd.Parameters.AddWithValue("$value", value);
                cmd.ExecuteNonQuery();
            }
        }
    }
}
