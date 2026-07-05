using SQLite;

namespace GoldBusinessManager.Core.Entities;

[Table("Customers")]
public class Customer
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
    /// Balance the customer already owed before this app started tracking them.
    /// Positive = customer owes the shop. Current outstanding balance is calculated
    /// from OpeningBalance + unpaid sales invoice balances.
    /// </summary>
    public double OpeningBalance { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
