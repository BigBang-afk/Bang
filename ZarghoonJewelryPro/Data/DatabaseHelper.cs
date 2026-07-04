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
    }
}
