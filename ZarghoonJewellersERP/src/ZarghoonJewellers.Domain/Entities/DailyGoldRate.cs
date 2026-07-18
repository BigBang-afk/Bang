namespace ZarghoonJewellers.Domain.Entities;

/// <summary>The gold rate(s) and USD/PKR exchange rate published for a given calendar day.
/// One row per <see cref="RateDate"/> - the dashboard and invoicing modules always read the latest row.</summary>
public class DailyGoldRate
{
    public int GoldRateId { get; set; }
    public DateOnly RateDate { get; set; }
    public decimal Rate24K { get; set; }
    public decimal Rate22K { get; set; }
    public decimal Rate21K { get; set; }
    public decimal Rate18K { get; set; }
    public decimal UsdPerOunce { get; set; }
    public decimal UsdToPkr { get; set; }
    public int EnteredBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public User EnteredByUser { get; set; } = null!;

    /// <summary>Returns the per-gram rate for the requested purity string (e.g. "22K").</summary>
    public decimal GetRateForPurity(string purity) => purity switch
    {
        "24K" => Rate24K,
        "22K" => Rate22K,
        "21K" => Rate21K,
        "18K" => Rate18K,
        _ => Rate22K
    };
}
