using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class NotificationTemplate : BaseEntity
{
    public string Key { get; set; } = string.Empty; // e.g. "signal.created", "signal.result.win"
    public NotificationType Type { get; set; }
    public string TitleTemplateEn { get; set; } = string.Empty;
    public string BodyTemplateEn { get; set; } = string.Empty;
    public string TitleTemplateUr { get; set; } = string.Empty;
    public string BodyTemplateUr { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
