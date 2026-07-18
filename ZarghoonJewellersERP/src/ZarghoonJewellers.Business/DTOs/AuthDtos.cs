namespace ZarghoonJewellers.Business.DTOs;

/// <summary>Result of an authentication attempt - never leaks whether the username or password was wrong,
/// to avoid user-enumeration.</summary>
public record LoginResultDto(bool Success, string? ErrorMessage, int UserId, string FullName, string RoleName, bool MustChangePassword);
