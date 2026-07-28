using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// Frozen candle snapshot (JSON array of OHLCV) captured at signal-creation time so the
/// analysis panel can always render the exact chart context the engine evaluated.
/// </summary>
public class SignalSnapshot : BaseEntity
{
    public Guid SignalId { get; set; }
    public Signal? Signal { get; set; }
    public string Label { get; set; } = string.Empty; // "AtCreation", "AtEntry", "AtExpiration"
    public string CandlesJson { get; set; } = "[]";
    public DateTime CapturedAtUtc { get; set; } = DateTime.UtcNow;
}
