namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// Generic key/value application setting persisted to SQLite. Strongly
/// typed settings screens read/write through this table so every setting
/// change is journaled with an UpdatedAtUtc timestamp.
/// </summary>
public class AppSetting
{
    public int Id { get; set; }

    public required string Key { get; set; }

    public required string Value { get; set; }

    public required string Category { get; set; }

    public string? Description { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
