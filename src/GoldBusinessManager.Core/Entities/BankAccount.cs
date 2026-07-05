using SQLite;

namespace GoldBusinessManager.Core.Entities;

[Table("BankAccounts")]
public class BankAccount
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [NotNull, MaxLength(100)]
    public string AccountName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string BankName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    public double OpeningBalance { get; set; }

    /// <summary>Kept in sync as transactions are posted, so balances don't need to be recomputed on every read.</summary>
    public double CurrentBalance { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
