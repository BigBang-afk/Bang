using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

/// <summary>
/// One row per item type, holding the current on-hand balance for that shape of
/// 24K gold. The overall shop total is the sum of WeightInGrams across all rows.
/// </summary>
[Table("GoldStock")]
public class GoldStock
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [Indexed(Unique = true)]
    public ItemType ItemType { get; set; }

    /// <summary>Current on-hand weight for this item type, in grams.</summary>
    public double WeightInGrams { get; set; }

    /// <summary>Below this many grams, the dashboard/stock page shows a low-stock warning.</summary>
    public double LowStockThresholdInGrams { get; set; } = 10;

    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
