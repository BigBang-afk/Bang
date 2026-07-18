using ZarghoonJewellers.Business.DTOs;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IAuthService
{
    /// <summary>Verifies credentials, updates LastLoginDate, writes an audit log entry and, on success,
    /// populates the singleton <c>CurrentSession</c> so the rest of the app knows who is logged in.</summary>
    Task<LoginResultDto> LoginAsync(string username, string password, CancellationToken cancellationToken = default);

    Task LogoutAsync(CancellationToken cancellationToken = default);

    Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
}
