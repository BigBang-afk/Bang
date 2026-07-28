using System.Security.Claims;
using FlexXSignal.Application.Features.MarketData;
using FlexXSignal.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/market-data")]
public sealed class MarketDataController : ControllerBase
{
    private readonly IMarketDataService _marketDataService;
    public MarketDataController(IMarketDataService marketDataService) => _marketDataService = marketDataService;

    [HttpGet("pairs")]
    public async Task<IActionResult> GetPairs([FromQuery] bool activeOnly = true, CancellationToken ct = default) =>
        Ok((await _marketDataService.GetPairsAsync(activeOnly, ct)).Value);

    [HttpPost("pairs")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertPair([FromQuery] Guid? id, UpsertTradingPairRequest request, CancellationToken ct)
    {
        var result = await _marketDataService.UpsertPairAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> GetSessions(CancellationToken ct) => Ok((await _marketDataService.GetSessionsAsync(ct)).Value);

    [HttpPost("sessions")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertSession([FromQuery] Guid? id, UpsertTradingSessionRequest request, CancellationToken ct)
    {
        var result = await _marketDataService.UpsertSessionAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("providers")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetProviders(CancellationToken ct) => Ok((await _marketDataService.GetProviderConfigurationsAsync(ct)).Value);

    [HttpPost("providers")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpsertProvider([FromQuery] Guid? id, UpsertProviderConfigurationRequest request, CancellationToken ct)
    {
        var result = await _marketDataService.UpsertProviderConfigurationAsync(id, request, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpGet("health")]
    [Authorize(Roles = "SuperAdmin,Admin,Analyst")]
    public async Task<IActionResult> GetHealth([FromQuery] int count = 50, CancellationToken ct = default) =>
        Ok((await _marketDataService.GetRecentHealthAsync(count, ct)).Value);

    [HttpGet("candles")]
    public async Task<IActionResult> GetCandles([FromQuery] string pair, [FromQuery] Timeframe timeframe, [FromQuery] DateTime fromUtc, [FromQuery] DateTime toUtc, CancellationToken ct)
    {
        var result = await _marketDataService.GetCandlesAsync(pair, timeframe, fromUtc, toUtc, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    [HttpPost("candles/import-csv")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> ImportCsv([FromQuery] string pair, [FromQuery] Timeframe timeframe, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { errors = new[] { "File is empty." } });
        await using var stream = file.OpenReadStream();
        var result = await _marketDataService.ImportCsvAsync(stream, pair, timeframe, CurrentUserId, ct);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
