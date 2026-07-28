using System.Security.Claims;
using FlexXSignal.Application.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    public AuthController(IAuthService authService) => _authService = authService;

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(request, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request, ct);
        return result.Succeeded ? Ok(result.Value) : Unauthorized(new { errors = result.Errors });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken, ct);
        return result.Succeeded ? Ok(result.Value) : Unauthorized(new { errors = result.Errors });
    }

    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke(RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await _authService.RevokeRefreshTokenAsync(request.RefreshToken, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        await _authService.ForgotPasswordAsync(request, ct);
        return Ok(new { message = "If an account with this email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ResetPasswordAsync(request, ct);
        return result.Succeeded ? Ok() : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ChangePasswordAsync(CurrentUserId, request, ct);
        return result.Succeeded ? Ok() : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var result = await _authService.GetProfileAsync(CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : NotFound();
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request, CancellationToken ct)
    {
        var result = await _authService.UpdateProfileAsync(CurrentUserId, request, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
}
