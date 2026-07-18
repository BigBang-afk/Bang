namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single grantable capability, grouped by <see cref="ModuleName"/> (e.g. "Stock", "Invoices").</summary>
public class Permission
{
    public int PermissionId { get; set; }
    public string PermissionName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
