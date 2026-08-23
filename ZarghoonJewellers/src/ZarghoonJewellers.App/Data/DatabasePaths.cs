using System;
using System.IO;

namespace ZarghoonJewellers.App.Data
{
    /// <summary>Resolves where the offline SQLite database file lives on disk.</summary>
    public static class DatabasePaths
    {
        public static string DataFolder
        {
            get
            {
                string folder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "ZarghoonJewellers");
                Directory.CreateDirectory(folder);
                return folder;
            }
        }

        public static string DatabaseFile => Path.Combine(DataFolder, "zarghoon_jewellers.db");

        public static string ConnectionString => $"Data Source={DatabaseFile}";
    }
}
