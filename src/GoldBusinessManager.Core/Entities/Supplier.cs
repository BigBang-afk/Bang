using SQLite;

namespace GoldBusinessManager.Core.Entities;

[Table("Suppliers")]
public class Supplier
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [NotNull, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Indexed, MaxLength(20)]
    public string Mobile { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Address { get; set; }

    /// <summary>
    /// Balance already owed to the supplier before this app started tracking them.
    /// Positive = shop owes the supplier. Current payable is calculated from
    /// OpeningBalance + unpaid purchase balances.
    /// </summary>
    public double OpeningBalance { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
