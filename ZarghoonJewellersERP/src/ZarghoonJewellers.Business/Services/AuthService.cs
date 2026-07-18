using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Security;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly CurrentSession _currentSession;
    private readonly IAuditService _auditService;

    public AuthService(IUnitOfWork unitOfWork, CurrentSession currentSession, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _currentSession = currentSession;
        _auditService = auditService;
    }

    public async Task<LoginResultDto> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByUsernameWithRoleAsync(username, cancellationToken);

        // Deliberately identical error message for "no such user" and "wrong password" - avoids
        // telling an attacker which usernames exist in the system.
        const string genericError = "Invalid username or password.";

        if (user is null || !user.IsActive)
            return new LoginResultDto(false, genericError, 0, string.Empty, string.Empty, false);

        bool passwordOk = PasswordHasher.VerifyPassword(password, user.PasswordHash, user.PasswordSalt, user.PasswordIterations);
        if (!passwordOk)
        {
            await _auditService.LogAsync(user.UserId, "Login", "Users", user.UserId.ToString(), null, "Failed login attempt", cancellationToken);
            return new LoginResultDto(false, genericError, 0, string.Empty, string.Empty, false);
        }

        user.LastLoginDate = DateTime.Now;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var grantedKeys = user.Role.RolePermissions
            .Where(rp => rp.CanView)
            .SelectMany(rp => BuildPermissionKeys(rp))
            .ToList();

        _currentSession.SignIn(user.UserId, user.Username, user.FullName, user.RoleId, user.Role.RoleName, grantedKeys);

        await _auditService.LogAsync(user.UserId, "Login", "Users", user.UserId.ToString(), null, "Successful login", cancellationToken);

        return new LoginResultDto(true, null, user.UserId, user.FullName, user.Role.RoleName, user.MustChangePassword);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        if (_currentSession.IsAuthenticated)
        {
            await _auditService.LogAsync(_currentSession.UserId, "Logout", "Users", _currentSession.UserId.ToString(), null, "User signed out", cancellationToken);
        }
        _currentSession.SignOut();
    }

    public async Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user is null) return false;

        if (!PasswordHasher.VerifyPassword(currentPassword, user.PasswordHash, user.PasswordSalt, user.PasswordIterations))
            return false;

        var (hash, salt, iterations) = PasswordHasher.HashPassword(newPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.PasswordIterations = iterations;
        user.MustChangePassword = false;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static IEnumerable<string> BuildPermissionKeys(RolePermission rp)
    {
        var module = rp.Permission.ModuleName;
        if (rp.CanView) yield return $"{module}.CanView";
        if (rp.CanAdd) yield return $"{module}.CanAdd";
        if (rp.CanEdit) yield return $"{module}.CanEdit";
        if (rp.CanDelete) yield return $"{module}.CanDelete";
        if (rp.CanPrint) yield return $"{module}.CanPrint";
    }
}
