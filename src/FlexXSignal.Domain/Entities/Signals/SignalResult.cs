using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// Immutable once automatically verified. Any administrator correction must go through
/// the audited correction workflow which records old/new values instead of mutating silently.
/// </summary>
public class SignalResult : BaseEntity
{
    public Guid SignalId { get; set; }
    public Signal? Signal { get; set; }

    public SignalStatus Outcome { get; set; } // Win, Loss, Tie, Canceled, Missed, DataError

    public Guid? EntryCandleId { get; set; }
    public Guid? ExpirationCandleId { get; set; }

    public decimal EntryPrice { get; set; }
    public decimal ExpirationPrice { get; set; }

    public DateTime OriginalSignalTimestampUtc { get; set; }
    public DateTime EntryTimestampUtc { get; set; }
    public DateTime ExpirationTimestampUtc { get; set; }
    public DateTime ProviderTimestampUtc { get; set; }
    public DateTime ServerTimestampUtc { get; set; }
    public DateTime VerificationTimestampUtc { get; set; }

    public VerificationMethod VerificationMethod { get; set; } = VerificationMethod.Automatic;
    public string DataSourceIdentifier { get; set; } = string.Empty;

    public bool IsLocked { get; set; }

    // Correction audit trail (populated only when an admin corrects a locked result)
    public SignalStatus? CorrectedFromOutcome { get; set; }
    public string? CorrectionReason { get; set; }
    public Guid? CorrectedByUserId { get; set; }
    public DateTime? CorrectedAtUtc { get; set; }
}
