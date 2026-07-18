using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IUserRepository : IGenericRepository<User>
{
    /// <summary>Loads a user together with Role -> RolePermissions -> Permission for the login flow.</summary>
    Task<User?> GetByUsernameWithRoleAsync(string username, CancellationToken cancellationToken = default);
    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);
}
