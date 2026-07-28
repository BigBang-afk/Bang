using System.Security.Claims;
using FlexXSignal.Application.Features.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/support-tickets")]
[Authorize]
public sealed class SupportTicketsController : ControllerBase
{
    private readonly ISupportTicketService _supportTicketService;
    public SupportTicketsController(ISupportTicketService supportTicketService) => _supportTicketService = supportTicketService;

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken ct) => Ok((await _supportTicketService.GetForUserAsync(CurrentUserId, ct)).Value);

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Analyst")]
    public async Task<IActionResult> GetAll([FromQuery] Domain.Enums.SupportTicketStatus? status, [FromQuery] Domain.Enums.SupportTicketPriority? priority, CancellationToken ct) =>
        Ok((await _supportTicketService.GetAllAsync(new SupportTicketStatusFilter(status, priority), ct)).Value);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _supportTicketService.GetByIdAsync(id, ct);
        return result.Succeeded ? Ok(result.Value) : NotFound(new { errors = result.Errors });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSupportTicketRequest request, CancellationToken ct)
    {
        var result = await _supportTicketService.CreateAsync(CurrentUserId, request, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> AddMessage(Guid id, AddSupportMessageRequest request, CancellationToken ct)
    {
        var isStaff = User.IsInRole("SuperAdmin") || User.IsInRole("Admin") || User.IsInRole("Analyst");
        var result = await _supportTicketService.AddMessageAsync(id, CurrentUserId, isStaff, request, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin,Analyst")]
    public async Task<IActionResult> Update(Guid id, UpdateSupportTicketRequest request, CancellationToken ct)
    {
        var result = await _supportTicketService.UpdateAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
