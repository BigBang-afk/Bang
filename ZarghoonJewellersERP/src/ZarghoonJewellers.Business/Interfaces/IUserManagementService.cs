using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>Administers login accounts. Kept separate from <see cref="IAuthService"/> (which only
/// verifies credentials for the currently signing-in user) since creating/resetting accounts is
/// an administrative capability gated by the Users.CanAdd/CanEdit permissions.</summary>
public interface IUserManagementService
{
    Task<IReadOnlyList<User>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Role>> GetAllRolesAsync(CancellationToken cancellationToken = default);
    Task<User> CreateUserAsync(string username, string password, string fullName, string? email, int roleId, CancellationToken cancellationToken = default);
    Task UpdateUserAsync(int userId, string fullName, string? email, int roleId, bool isActive, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(int userId, string newPassword, CancellationToken cancellationToken = default);
}
