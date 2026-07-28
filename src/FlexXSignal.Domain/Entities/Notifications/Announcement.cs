using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class Announcement : BaseEntity
{
    public string TitleEn { get; set; } = string.Empty;
    public string BodyEn { get; set; } = string.Empty;
    public string? TitleUr { get; set; }
    public string? BodyUr { get; set; }
    public string Severity { get; set; } = "Info"; // Info, Warning, Critical
    public bool IsPublished { get; set; }
    public DateTime? PublishAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public Guid CreatedByUserId { get; set; }
}
