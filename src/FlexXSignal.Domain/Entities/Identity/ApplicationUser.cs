using Microsoft.AspNetCore.Identity;

namespace FlexXSignal.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "en"; // en, ur, hinglish
    public string TimeZoneId { get; set; } = "UTC";
    public string ThemePreference { get; set; } = "dark"; // dark, light
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAtUtc { get; set; }
    public string? AvatarUrl { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<UserSubscription> Subscriptions { get; set; } = new List<UserSubscription>();
    public ICollection<LoginHistory> LoginHistories { get; set; } = new List<LoginHistory>();
}
