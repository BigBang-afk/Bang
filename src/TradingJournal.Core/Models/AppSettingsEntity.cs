namespace TradingJournal.Core.Models;

/// <summary>
/// Single-row table holding the app's configurable rates.
/// </summary>
public class AppSettingsEntity
{
    public int Id { get; set; }

    /// <summary>How many PKR one USD is worth.</summary>
    public decimal UsdToPkrRate { get; set; } = 280m;

    /// <summary>PKR price of one unit of gold (e.g. one Tola), used to convert PKR into a gold equivalent.</summary>
    public decimal GoldRatePerUnit { get; set; } = 250000m;

    /// <summary>Label for the gold unit the rate above is quoted in (e.g. "Tola", "Gram", "Ounce").</summary>
    public string GoldUnitLabel { get; set; } = "Tola";

    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
