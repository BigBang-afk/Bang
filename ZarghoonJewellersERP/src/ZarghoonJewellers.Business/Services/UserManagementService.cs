using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Security;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class UserManagementService : IUserManagementService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public UserManagementService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<User>> GetAllUsersAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Users.GetAllAsync(cancellationToken);

    public Task<IReadOnlyList<Role>> GetAllRolesAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Roles.GetAllAsync(cancellationToken);

    public async Task<User> CreateUserAsync(string username, string password, string fullName, string? email, int roleId, CancellationToken cancellationToken = default)
    {
        if (await _unitOfWork.Users.UsernameExistsAsync(username, cancellationToken))
            throw new BusinessRuleException($"Username '{username}' is already taken.");

        var (hash, salt, iterations) = PasswordHasher.HashPassword(password);

        var user = new User
        {
            Username = username,
            PasswordHash = hash,
            PasswordSalt = salt,
            PasswordIterations = iterations,
            FullName = fullName,
            Email = email,
            RoleId = roleId,
            IsActive = true,
            MustChangePassword = true,
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Users", user.UserId.ToString(), null, username, cancellationToken);
        return user;
    }

    public async Task UpdateUserAsync(int userId, string fullName, string? email, int roleId, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken)
            ?? throw new BusinessRuleException("User not found.");

        user.FullName = fullName;
        user.Email = email;
        user.RoleId = roleId;
        user.IsActive = isActive;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "Users", userId.ToString(), null, fullName, cancellationToken);
    }

    public async Task ResetPasswordAsync(int userId, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken)
            ?? throw new BusinessRuleException("User not found.");

        var (hash, salt, iterations) = PasswordHasher.HashPassword(newPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.PasswordIterations = iterations;
        user.MustChangePassword = true;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "Users", userId.ToString(), null, "Password reset", cancellationToken);
    }
}
