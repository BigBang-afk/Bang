using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class SignalReason : BaseEntity
{
    public Guid SignalId { get; set; }
    public Signal? Signal { get; set; }
    public bool IsSupporting { get; set; } // true = supporting reason, false = rejection reason
    public string Code { get; set; } = string.Empty; // e.g. "HigherHighsLows", "EmaAlignment"
    public string Description { get; set; } = string.Empty;
    public string IndicatorsUsedCsv { get; set; } = string.Empty;
    public string SupportingCandleIndexesCsv { get; set; } = string.Empty;
}
