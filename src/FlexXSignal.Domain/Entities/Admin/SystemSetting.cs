using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // General, SignalEngine, Notifications, Branding
    public string DataType { get; set; } = "string";
    public string? Description { get; set; }
    public bool IsSecret { get; set; }
}
