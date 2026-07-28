namespace FlexXSignal.Application.Features.Auth;

public sealed record RegisterRequest(string Email, string Password, string DisplayName, string? PreferredLanguage);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    Guid UserId,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles);

public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string PreferredLanguage,
    string TimeZoneId,
    string ThemePreference,
    string? AvatarUrl,
    IReadOnlyList<string> Roles,
    DateTime CreatedAtUtc,
    DateTime? LastLoginAtUtc);

public sealed record UpdateProfileRequest(string DisplayName, string PreferredLanguage, string TimeZoneId, string ThemePreference);
