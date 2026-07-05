using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

/// <summary>
/// Full audit trail of every change to GoldStock: sales deduct, purchases add,
/// and manual add/remove/adjustment entries are recorded here so stock history
/// and stock reports can be rebuilt at any time.
/// </summary>
[Table("GoldStockMovements")]
public class GoldStockMovement
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    public DateTime MovementDate { get; set; } = DateTime.Now;

    public ItemType ItemType { get; set; }

    public StockMovementType MovementType { get; set; }

    /// <summary>Signed: positive for additions (purchase/manual add), negative for removals (sale/manual remove).</summary>
    public double WeightInGrams { get; set; }

    /// <summary>Running stock balance for this ItemType immediately after this movement.</summary>
    public double BalanceAfterInGrams { get; set; }

    /// <summary>"SalesInvoice", "Purchase", or "Manual".</summary>
    [MaxLength(30)]
    public string ReferenceType { get; set; } = "Manual";

    /// <summary>Id of the SalesInvoice/Purchase row that caused this movement, when applicable.</summary>
    public int? ReferenceId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
