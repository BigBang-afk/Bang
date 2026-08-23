using ZarghoonJewellers.App.Data;
using ZarghoonJewellers.App.Models;

namespace ZarghoonJewellers.App.Repositories
{
    public class SettingsRepository
    {
        public AppSettings Get()
        {
            var settings = new AppSettings();

            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT Key, Value FROM Settings";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var key = reader.GetString(0);
                var value = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);

                switch (key)
                {
                    case "ShopName": settings.ShopName = value; break;
                    case "ShopAddress": settings.ShopAddress = value; break;
                    case "PhoneNumber": settings.PhoneNumber = value; break;
                    case "ReportHeader": settings.ReportHeader = value; break;
                    case "ReportFooter": settings.ReportFooter = value; break;
                }
            }

            return settings;
        }

        public void Save(AppSettings settings)
        {
            using var connection = SqliteConnectionFactory.Create();

            void SaveKey(string key, string value)
            {
                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
INSERT INTO Settings (Key, Value) VALUES ($key, $value)
ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value";
                cmd.Parameters.AddWithValue("$key", key);
                cmd.Parameters.AddWithValue("$value", value ?? string.Empty);
                cmd.ExecuteNonQuery();
            }

            SaveKey("ShopName", settings.ShopName);
            SaveKey("ShopAddress", settings.ShopAddress);
            SaveKey("PhoneNumber", settings.PhoneNumber);
            SaveKey("ReportHeader", settings.ReportHeader);
            SaveKey("ReportFooter", settings.ReportFooter);
        }
    }
}
