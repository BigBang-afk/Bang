namespace TradingJournal.Core.Data;

public static class AppPaths
{
    public static string GetDatabasePath()
    {
        var folder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "TradingJournal");

        Directory.CreateDirectory(folder);

        return Path.Combine(folder, "journal.db");
    }
}
