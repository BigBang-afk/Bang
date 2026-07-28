using System.Security.Claims;
using FlexXSignal.Application.Features.Strategies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/strategies")]
[Authorize]
public sealed class StrategiesController : ControllerBase
{
    private readonly IStrategyService _strategyService;
    public StrategiesController(IStrategyService strategyService) => _strategyService = strategyService;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) => Ok((await _strategyService.GetAllAsync(ct)).Value);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _strategyService.GetByIdAsync(id, ct);
        return result.Succeeded ? Ok(result.Value) : NotFound(new { errors = result.Errors });
    }

    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformance(CancellationToken ct) => Ok((await _strategyService.GetPerformanceComparisonAsync(ct)).Value);

    [HttpPost("versions")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreateVersion(CreateStrategyVersionRequest request, CancellationToken ct)
    {
        var result = await _strategyService.CreateVersionAsync(request, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateStrategyStatusRequest request, CancellationToken ct)
    {
        var result = await _strategyService.UpdateStatusAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("versions/{versionId:guid}/activate")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ActivateVersion(Guid versionId, CancellationToken ct)
    {
        var result = await _strategyService.ActivateVersionAsync(versionId, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
