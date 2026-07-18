namespace ZarghoonJewellers.Domain.Entities;

/// <summary>Junction entity granting a <see cref="Permission"/> to a <see cref="Role"/> with per-verb CRUD flags.</summary>
public class RolePermission
{
    public int RolePermissionId { get; set; }
    public int RoleId { get; set; }
    public int PermissionId { get; set; }
    public bool CanView { get; set; } = true;
    public bool CanAdd { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool CanPrint { get; set; }

    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
