namespace ZarghoonJewelryPro.Data
{
    /// <summary>
    /// Edit these 5 values to match your own MySQL / phpMyAdmin setup.
    /// This is the ONLY place you need to change your database credentials.
    /// </summary>
    public static class DbConfig
    {
        public const string Server = "localhost";
        public const string Port = "3306";
        public const string DatabaseName = "zarghoon_jewelry";
        public const string UserId = "root";
        public const string Password = "";

        public static string ConnectionString =>
            $"Server={Server};Port={Port};Database={DatabaseName};Uid={UserId};Pwd={Password};";
    }
}
