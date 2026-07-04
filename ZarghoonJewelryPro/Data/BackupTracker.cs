using System;
using System.IO;

namespace ZarghoonJewelryPro.Data
{
    /// <summary>
    /// Remembers when the last successful backup happened (in a small text
    /// file next to the exe) so the Dashboard can remind the user once a day.
    /// </summary>
    public static class BackupTracker
    {
        private static string TrackerFilePath =>
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "lastbackup.txt");

        public static void RecordBackupNow()
        {
            File.WriteAllText(TrackerFilePath, DateTime.Now.ToString("o"));
        }

        public static bool WasBackedUpToday()
        {
            if (!File.Exists(TrackerFilePath))
            {
                return false;
            }

            if (DateTime.TryParse(File.ReadAllText(TrackerFilePath), out DateTime lastBackup))
            {
                return lastBackup.Date == DateTime.Now.Date;
            }

            return false;
        }
    }
}
