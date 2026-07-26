namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// One weighted line item of a Signal's confidence breakdown
/// (e.g. "Trend alignment: 15/15"). Exists so every signal can show a
/// full, auditable score breakdown rather than a single opaque number.
/// </summary>
public class SignalScoreComponent
{
    public long Id { get; set; }

    public long SignalId { get; set; }

    public Signal? Signal { get; set; }

    public required string ComponentName { get; set; }

    public int Score { get; set; }

    public int MaxScore { get; set; }

    public string? Explanation { get; set; }
}
