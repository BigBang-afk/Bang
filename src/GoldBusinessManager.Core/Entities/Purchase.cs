using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

[Table("Purchases")]
public class Purchase
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    /// <summary>Auto-generated, e.g. "PUR-0001".</summary>
    [Indexed(Unique = true), NotNull, MaxLength(30)]
    public string PurchaseNumber { get; set; } = string.Empty;

    public DateTime PurchaseDate { get; set; } = DateTime.Now;

    /// <summary>Nullable: gold may be bought from a walk-in seller not saved as a Supplier.</summary>
    public int? SupplierId { get; set; }

    [NotNull, MaxLength(150)]
    public string PartyName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string PartyMobile { get; set; } = string.Empty;

    public ItemType ItemType { get; set; }

    /// <summary>Only used when ItemType == Custom.</summary>
    [MaxLength(100)]
    public string? ItemTypeCustomName { get; set; }

    public double WeightInput { get; set; }

    public WeightUnit WeightUnit { get; set; }

    /// <summary>WeightInput converted to grams. This is the only weight ever used in calculations/stock.</summary>
    public double WeightInGrams { get; set; }

    /// <summary>24K gold rate per gram at the time of purchase.</summary>
    public double GoldRatePerGram { get; set; }

    /// <summary>TotalAmount = WeightInGrams * GoldRatePerGram.</summary>
    public double TotalAmount { get; set; }

    public double PaidAmount { get; set; }

    /// <summary>Balance = TotalAmount - PaidAmount. Added to the supplier ledger.</summary>
    public double BalanceAmount { get; set; }

    public PaymentMethod PaymentMethod { get; set; }

    /// <summary>Portion of PaidAmount that came from cash (used when PaymentMethod == Mixed).</summary>
    public double CashAmount { get; set; }

    /// <summary>Portion of PaidAmount that came from a bank account (used when PaymentMethod == Mixed).</summary>
    public double BankAmount { get; set; }

    public int? BankAccountId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public DateTime? UpdatedAt { get; set; }

    /// <summary>Soft delete so deleted purchases can still be audited; stock/ledger effects are reversed on delete.</summary>
    public bool IsDeleted { get; set; }
}
