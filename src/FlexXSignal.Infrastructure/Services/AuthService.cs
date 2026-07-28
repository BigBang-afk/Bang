using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Auth;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Identity;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlexXSignal.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwtTokenService,
        IDateTimeProvider clock,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        IOptions<JwtSettings> jwtSettings)
    {
        _db = db;
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _clock = clock;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null) return Result<AuthResponse>.Failure("An account with this email already exists.");

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            PreferredLanguage = request.PreferredLanguage ?? "en",
            CreatedAtUtc = _clock.UtcNow,
            EmailConfirmed = true // dev/demo mode: real deployments should wire an email-confirmation flow
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded) return Result<AuthResponse>.Failure(createResult.Errors.Select(e => e.Description));

        await _userManager.AddToRoleAsync(user, Roles.FreeUser);

        _db.NotificationPreferences.Add(new NotificationPreference { UserId = user.Id });
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Create, nameof(ApplicationUser), user.Id.ToString(), null, new { user.Email }, "User self-registration", ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        var loginHistory = new LoginHistory { IpAddress = _currentUser.IpAddress, UserAgent = string.Empty, AttemptedAtUtc = _clock.UtcNow };

        if (user is null)
        {
            return Result<AuthResponse>.Failure("Invalid email or password.");
        }

        loginHistory.UserId = user.Id;

        if (await _userManager.IsLockedOutAsync(user))
        {
            loginHistory.Success = false;
            loginHistory.FailureReason = "Account locked out.";
            _db.LoginHistories.Add(loginHistory);
            await _db.SaveChangesAsync(ct);
            return Result<AuthResponse>.Failure("Account is temporarily locked due to repeated failed attempts. Try again later.");
        }

        if (!user.IsActive)
        {
            loginHistory.Success = false;
            loginHistory.FailureReason = "Account deactivated.";
            _db.LoginHistories.Add(loginHistory);
            await _db.SaveChangesAsync(ct);
            return Result<AuthResponse>.Failure("This account has been deactivated. Contact support.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            loginHistory.Success = false;
            loginHistory.FailureReason = "Invalid password.";
            _db.LoginHistories.Add(loginHistory);
            await _db.SaveChangesAsync(ct);
            return Result<AuthResponse>.Failure("Invalid email or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        user.LastLoginAtUtc = _clock.UtcNow;
        await _userManager.UpdateAsync(user);

        loginHistory.Success = true;
        _db.LoginHistories.Add(loginHistory);
        await _db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<Result<AuthResponse>> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.RefreshTokens.Include(x => x.User).FirstOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (existing is null || !existing.IsActive) return Result<AuthResponse>.Failure("Invalid or expired refresh token.");

        existing.RevokedAtUtc = _clock.UtcNow;
        existing.RevokedByIp = _currentUser.IpAddress;

        var response = await BuildAuthResponseAsync(existing.User!, ct);
        if (response.Succeeded)
        {
            existing.ReplacedByTokenHash = _jwtTokenService.HashToken(response.Value!.RefreshToken);
        }
        await _db.SaveChangesAsync(ct);
        return response;
    }

    public async Task<Result> RevokeRefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (existing is null) return Result.Failure("Token not found.");
        existing.RevokedAtUtc = _clock.UtcNow;
        existing.RevokedByIp = _currentUser.IpAddress;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        // Always return success to avoid leaking which emails are registered.
        if (user is null) return Result.Success();
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // In production this token is emailed via IEmailSender; logged here only for the dev-safe manual flow.
        await _auditLog.LogAsync(AuditAction.SecurityEvent, nameof(ApplicationUser), user.Id.ToString(), null, null, "Password reset requested", ct);
        return Result.Success();
    }

    public async Task<Result> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null) return Result.Failure("Invalid request.");
        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded) return Result.Failure(result.Errors.Select(e => e.Description));
        return Result.Success();
    }

    public async Task<Result> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Result.Failure("User not found.");
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded) return Result.Failure(result.Errors.Select(e => e.Description));
        return Result.Success();
    }

    public async Task<Result<UserProfileDto>> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Result<UserProfileDto>.Failure("User not found.");
        var roles = await _userManager.GetRolesAsync(user);
        return Result<UserProfileDto>.Success(ToProfileDto(user, roles));
    }

    public async Task<Result<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Result<UserProfileDto>.Failure("User not found.");
        user.DisplayName = request.DisplayName;
        user.PreferredLanguage = request.PreferredLanguage;
        user.TimeZoneId = request.TimeZoneId;
        user.ThemePreference = request.ThemePreference;
        await _userManager.UpdateAsync(user);
        var roles = await _userManager.GetRolesAsync(user);
        return Result<UserProfileDto>.Success(ToProfileDto(user, roles));
    }

    private async Task<Result<AuthResponse>> BuildAuthResponseAsync(ApplicationUser user, CancellationToken ct)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var (accessToken, expiresAt) = _jwtTokenService.GenerateAccessToken(user, roles);
        var refreshTokenValue = _jwtTokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(refreshTokenValue),
            ExpiresAtUtc = _clock.UtcNow.AddDays(_jwtSettings.RefreshTokenDays),
            CreatedByIp = _currentUser.IpAddress
        });
        await _db.SaveChangesAsync(ct);

        return Result<AuthResponse>.Success(new AuthResponse(
            accessToken, expiresAt, refreshTokenValue, user.Id, user.Email!, user.DisplayName, roles.ToList()));
    }

    private static UserProfileDto ToProfileDto(ApplicationUser user, IList<string> roles) => new(
        user.Id, user.Email!, user.DisplayName, user.PreferredLanguage, user.TimeZoneId, user.ThemePreference,
        user.AvatarUrl, roles.ToList(), user.CreatedAtUtc, user.LastLoginAtUtc);
}
