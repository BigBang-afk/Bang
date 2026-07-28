namespace FlexXSignal.Infrastructure.Identity;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "FlexXSignal";
    public string Audience { get; set; } = "FlexXSignal.Client";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
}
