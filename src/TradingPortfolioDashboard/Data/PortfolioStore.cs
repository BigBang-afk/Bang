using System;
using System.IO;
using System.Text.Json;

namespace TradingPortfolioDashboard.Data;

/// <summary>Loads and saves portfolio data as a local JSON file under %AppData%.</summary>
public class PortfolioStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private readonly string _filePath;

    public PortfolioStore()
    {
        var folder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "TradingPortfolioDashboard");
        Directory.CreateDirectory(folder);
        _filePath = Path.Combine(folder, "portfolio-data.json");
    }

    public PortfolioData Load()
    {
        if (!File.Exists(_filePath))
        {
            return new PortfolioData();
        }

        var json = File.ReadAllText(_filePath);
        if (string.IsNullOrWhiteSpace(json))
        {
            return new PortfolioData();
        }

        return JsonSerializer.Deserialize<PortfolioData>(json, JsonOptions) ?? new PortfolioData();
    }

    public void Save(PortfolioData data)
    {
        var json = JsonSerializer.Serialize(data, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
