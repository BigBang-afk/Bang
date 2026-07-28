using System.Security.Claims;
using FlexXSignal.Application.Features.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    public NotificationsController(INotificationService notificationService) => _notificationService = notificationService;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] bool unreadOnly = false, CancellationToken ct = default) =>
        Ok((await _notificationService.GetForUserAsync(CurrentUserId, unreadOnly, ct)).Value);

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var result = await _notificationService.MarkReadAsync(id, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : NotFound(new { errors = result.Errors });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await _notificationService.MarkAllReadAsync(CurrentUserId, ct);
        return NoContent();
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct) => Ok((await _notificationService.GetPreferencesAsync(CurrentUserId, ct)).Value);

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences(UpdateNotificationPreferenceRequest request, CancellationToken ct) =>
        Ok((await _notificationService.UpdatePreferencesAsync(CurrentUserId, request, ct)).Value);

    [HttpGet("~/api/announcements")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAnnouncements(CancellationToken ct) => Ok((await _notificationService.GetActiveAnnouncementsAsync(ct)).Value);

    [HttpPost("~/api/announcements")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertAnnouncement([FromQuery] Guid? id, UpsertAnnouncementRequest request, CancellationToken ct)
    {
        var result = await _notificationService.UpsertAnnouncementAsync(id, request, CurrentUserId, ct);
        return Ok(result.Value);
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
