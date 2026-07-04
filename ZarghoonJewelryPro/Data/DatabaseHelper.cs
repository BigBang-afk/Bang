using MySql.Data.MySqlClient;

namespace ZarghoonJewelryPro.Data
{
    /// <summary>
    /// Creates MySQL connections using the settings in DbConfig.
    /// Every form should call GetConnection() inside its own try/catch/using block.
    /// </summary>
    public static class DatabaseHelper
    {
        public static MySqlConnection GetConnection()
        {
            return new MySqlConnection(DbConfig.ConnectionString);
        }

        /// <summary>
        /// Turns a MySqlException into a specific, actionable message instead of
        /// a raw driver error, based on the well-known MySQL error numbers.
        /// </summary>
        public static string GetFriendlyErrorMessage(MySqlException ex)
        {
            switch (ex.Number)
            {
                case 0:
                case 1042:
                    return "Cannot reach the MySQL server at " +
                           $"{DbConfig.Server}:{DbConfig.Port}.\n\n" +
                           "Checklist:\n" +
                           "1. Is MySQL actually running? (e.g. start it from the XAMPP/WAMP control panel)\n" +
                           "2. Does DbConfig.cs have the correct Server and Port?\n\n" +
                           $"Raw error: {ex.Message}";

                case 1045:
                    return "MySQL rejected the login (wrong username/password).\n\n" +
                           "Check the UserId and Password values in DbConfig.cs match " +
                           "what you use to log into phpMyAdmin.\n\n" +
                           $"Raw error: {ex.Message}";

                case 1049:
                    return $"The database '{DbConfig.DatabaseName}' does not exist yet.\n\n" +
                           "Open phpMyAdmin and run Database/01_schema_users.sql (then 02, 03, 04) " +
                           "from the SQL tab to create it.\n\n" +
                           $"Raw error: {ex.Message}";

                case 1146:
                    return "A required table is missing.\n\n" +
                           "Make sure you've run every script in the Database folder, in order " +
                           "(01, then 02, then 03, then 04), in phpMyAdmin.\n\n" +
                           $"Raw error: {ex.Message}";

                default:
                    return "Database error: " + ex.Message;
            }
        }
    }
}
