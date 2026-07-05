using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

[Table("Users")]
public class User
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [NotNull, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Indexed(Unique = true), NotNull, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    /// <summary>SHA-256 hash of the PIN. The plain PIN is never stored.</summary>
    [NotNull]
    public string PinHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Staff;

    public bool IsActive { get; set; } = true;

    // Staff permission flags. Ignored for Admin users, who always have full access.
    public bool CanManageSales { get; set; } = true;
    public bool CanManagePurchases { get; set; } = true;
    public bool CanManageStock { get; set; } = true;
    public bool CanManageLedgers { get; set; } = true;
    public bool CanManageExpenses { get; set; } = true;
    public bool CanManageReports { get; set; } = true;
    public bool CanManageSettings { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
