using System.Security.Claims;
using FlexXSignal.Application.Features.Subscriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    public SubscriptionsController(ISubscriptionService subscriptionService) => _subscriptionService = subscriptionService;

    [HttpGet("subscription-plans")]
    public async Task<IActionResult> GetPlans([FromQuery] bool activeOnly = true, CancellationToken ct = default) =>
        Ok((await _subscriptionService.GetPlansAsync(activeOnly, ct)).Value);

    [HttpPost("subscription-plans")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertPlan([FromQuery] Guid? id, UpsertSubscriptionPlanRequest request, CancellationToken ct)
    {
        var result = await _subscriptionService.UpsertPlanAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("subscriptions/mine")]
    [Authorize]
    public async Task<IActionResult> GetMine(CancellationToken ct) => Ok((await _subscriptionService.GetActiveSubscriptionAsync(CurrentUserId, ct)).Value);

    [HttpPost("payments")]
    [Authorize]
    public async Task<IActionResult> SubmitPayment(SubmitPaymentRequest request, CancellationToken ct)
    {
        var result = await _subscriptionService.SubmitPaymentAsync(CurrentUserId, request, ct);
        return result.Succeeded ? Ok(new { paymentId = result.Value }) : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("payments/pending")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetPendingPayments(CancellationToken ct) => Ok((await _subscriptionService.GetPendingPaymentsAsync(ct)).Value);

    [HttpPost("payments/{id:guid}/review")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ReviewPayment(Guid id, ReviewPaymentRequest request, CancellationToken ct)
    {
        var result = await _subscriptionService.ReviewPaymentAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
