namespace ZarghoonJewellers.Domain.Entities;

/// <summary>An application login account. Passwords are never stored in plain text -
/// see <see cref="PasswordHash"/>/<see cref="PasswordSalt"/> and
/// ZarghoonJewellers.Common.Security.PasswordHasher.</summary>
public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
    public int PasswordIterations { get; set; } = 100_000;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int RoleId { get; set; }
    public string? ProfileImagePath { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public int? CreatedBy { get; set; }

    public Role Role { get; set; } = null!;
}
