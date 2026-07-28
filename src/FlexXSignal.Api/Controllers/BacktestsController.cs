using System.Security.Claims;
using System.Text;
using FlexXSignal.Application.Features.Backtesting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlexXSignal.Api.Controllers;

[ApiController]
[Route("api/backtests")]
[Authorize(Roles = "SuperAdmin,Admin,Analyst")]
public sealed class BacktestsController : ControllerBase
{
    private readonly IBacktestService _backtestService;
    public BacktestsController(IBacktestService backtestService) => _backtestService = backtestService;

    [HttpGet]
    public async Task<IActionResult> GetHistory(CancellationToken ct) => Ok((await _backtestService.GetHistoryAsync(null, ct)).Value);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetResult(Guid id, CancellationToken ct)
    {
        var result = await _backtestService.GetResultAsync(id, ct);
        return result.Succeeded ? Ok(result.Value) : NotFound(new { errors = result.Errors });
    }

    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> Export(Guid id, CancellationToken ct)
    {
        var result = await _backtestService.ExportResultCsvAsync(id, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return File(Encoding.UTF8.GetBytes(result.Value!), "text/csv", $"backtest-{id}.csv");
    }

    [HttpPost]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> Run([FromForm] RunBacktestFormRequest form, CancellationToken ct)
    {
        Stream? csvStream = form.CsvFile is { Length: > 0 } ? form.CsvFile.OpenReadStream() : null;
        var request = new RunBacktestRequest(
            form.Name, form.TradingPairId, form.Timeframe, form.StrategyVersionId, form.Duration,
            form.InSampleStartUtc, form.InSampleEndUtc, form.OutOfSampleStartUtc, form.OutOfSampleEndUtc,
            form.WalkForwardEnabled, form.WalkForwardFolds, form.ConfidenceThresholdOverride,
            null, csvStream, form.CsvFile?.FileName);

        var result = await _backtestService.QueueBacktestAsync(request, CurrentUserId, ct);
        if (csvStream is not null) await csvStream.DisposeAsync();
        return result.Succeeded ? Ok(new { backtestId = result.Value }) : BadRequest(new { errors = result.Errors });
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public sealed class RunBacktestFormRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid TradingPairId { get; set; }
    public Domain.Enums.Timeframe Timeframe { get; set; }
    public Guid StrategyVersionId { get; set; }
    public Domain.Enums.ExpirationDuration Duration { get; set; }
    public DateTime InSampleStartUtc { get; set; }
    public DateTime InSampleEndUtc { get; set; }
    public DateTime? OutOfSampleStartUtc { get; set; }
    public DateTime? OutOfSampleEndUtc { get; set; }
    public bool WalkForwardEnabled { get; set; }
    public int WalkForwardFolds { get; set; } = 1;
    public decimal ConfidenceThresholdOverride { get; set; }
    public IFormFile? CsvFile { get; set; }
}
