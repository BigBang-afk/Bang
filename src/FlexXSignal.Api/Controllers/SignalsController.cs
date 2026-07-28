using System.Security.Claims;
using System.Text;
using FlexXSignal.Application.Features.Signals;
using FlexXSignal.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/signals")]
public sealed class SignalsController : ControllerBase
{
    private readonly ISignalService _signalService;
    public SignalsController(ISignalService signalService) => _signalService = signalService;

    [HttpGet("live")]
    public async Task<IActionResult> GetLive(CancellationToken ct)
    {
        var result = await _signalService.GetLiveAndUpcomingAsync(CurrentUserId, ct);
        return Ok(result.Value);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _signalService.GetByIdAsync(id, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : NotFound(new { errors = result.Errors });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] SignalHistoryFilter filter, CancellationToken ct)
    {
        var result = await _signalService.GetHistoryAsync(CurrentUserId, filter, ct);
        return Ok(result.Value);
    }

    [HttpGet("history/export")]
    public async Task<IActionResult> ExportHistory([FromQuery] SignalHistoryFilter filter, CancellationToken ct)
    {
        var result = await _signalService.ExportHistoryCsvAsync(CurrentUserId, filter, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return File(Encoding.UTF8.GetBytes(result.Value!), "text/csv", "signal-history.csv");
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics(CancellationToken ct)
    {
        var result = await _signalService.GetStatisticsAsync(CurrentUserId, ct);
        return Ok(result.Value);
    }

    [HttpGet("confidence-calibration")]
    public async Task<IActionResult> GetConfidenceCalibration(CancellationToken ct)
    {
        var result = await _signalService.GetConfidenceCalibrationAsync(ct);
        return Ok(result.Value);
    }

    [HttpPost("manual")]
    [Authorize(Roles = "SuperAdmin,Admin,Analyst")]
    public async Task<IActionResult> CreateManual(CreateManualSignalRequest request, CancellationToken ct)
    {
        var result = await _signalService.CreateManualSignalAsync(request, CurrentUserIdRequired, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "SuperAdmin,Admin,Analyst")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelSignalRequest request, CancellationToken ct)
    {
        var result = await _signalService.CancelSignalAsync(id, request.Reason, CurrentUserIdRequired, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("{id:guid}/correct-result")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CorrectResult(Guid id, CorrectSignalResultRequest request, CancellationToken ct)
    {
        var result = await _signalService.CorrectSignalResultAsync(id, request, CurrentUserIdRequired, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    private Guid? CurrentUserId
    {
        get
        {
            var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    private Guid CurrentUserIdRequired => CurrentUserId ?? throw new UnauthorizedAccessException();
}

public sealed record CancelSignalRequest(string Reason);
