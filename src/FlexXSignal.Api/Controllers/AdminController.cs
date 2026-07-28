using System.Security.Claims;
using FlexXSignal.Application.Features.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin,Admin")]
public sealed class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    public AdminController(IAdminService adminService) => _adminService = adminService;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken ct) => Ok((await _adminService.GetDashboardSummaryAsync(ct)).Value);

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? search, CancellationToken ct) => Ok((await _adminService.GetUsersAsync(search, ct)).Value);

    [HttpPut("users/{id:guid}/roles")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateRoles(Guid id, UpdateUserRolesRequest request, CancellationToken ct)
    {
        var result = await _adminService.UpdateUserRolesAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("users/{id:guid}/active")]
    public async Task<IActionResult> SetActive(Guid id, SetUserActiveRequest request, CancellationToken ct)
    {
        var result = await _adminService.SetUserActiveAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles(CancellationToken ct) => Ok((await _adminService.GetAvailableRolesAsync(ct)).Value);

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogFilter filter, CancellationToken ct) => Ok((await _adminService.GetAuditLogsAsync(filter, ct)).Value);

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings([FromQuery] string? category, CancellationToken ct) => Ok((await _adminService.GetSettingsAsync(category, ct)).Value);

    [HttpPut("settings")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateSetting(UpdateSystemSettingRequest request, CancellationToken ct)
    {
        var result = await _adminService.UpdateSettingAsync(request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
