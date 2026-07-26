namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// Optional structured-log mirror for the in-app Application Logs page.
/// Primary logging goes through Serilog to console/file sinks
/// (see Infrastructure/Logging) - this table is only used when a
/// database sink is explicitly wired up, so the UI can query recent
/// entries without parsing log files.
/// </summary>
public class ApplicationLog
{
    public long Id { get; set; }

    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public required string Level { get; set; }

    public required string Message { get; set; }

    public string? Exception { get; set; }

    public string? SourceContext { get; set; }
}
