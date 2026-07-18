using System.Text.Json;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Local-disk autosave for in-progress work that hasn't been committed to the database yet -
/// used by the Quick Stock Entry grid so a crash, accidental close, or power cut doesn't lose
/// 100 half-typed rows. Stores one JSON file per named draft under
/// %AppData%\ZarghoonJewellers\Drafts\, entirely independent of the SQL database.
/// </summary>
public static class DraftStore
{
    private static readonly string DraftFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "ZarghoonJewellers", "Drafts");

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private static string GetPath(string draftName) => Path.Combine(DraftFolder, $"{draftName}.json");

    public static void Save<T>(string draftName, T data)
    {
        Directory.CreateDirectory(DraftFolder);
        var json = JsonSerializer.Serialize(data, JsonOptions);
        File.WriteAllText(GetPath(draftName), json);
    }

    public static T? Load<T>(string draftName)
    {
        var path = GetPath(draftName);
        if (!File.Exists(path)) return default;

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<T>(json);
        }
        catch (JsonException)
        {
            // A corrupted/partial draft file should never block the user from continuing -
            // treat it the same as "no draft exists".
            return default;
        }
    }

    public static bool Exists(string draftName) => File.Exists(GetPath(draftName));

    public static void Clear(string draftName)
    {
        var path = GetPath(draftName);
        if (File.Exists(path)) File.Delete(path);
    }

    public static DateTime? GetLastSavedTime(string draftName)
    {
        var path = GetPath(draftName);
        return File.Exists(path) ? File.GetLastWriteTime(path) : null;
    }
}
