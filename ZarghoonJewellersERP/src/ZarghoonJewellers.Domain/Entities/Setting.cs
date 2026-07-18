namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single application-wide key/value configuration setting (shop name, invoice prefix, theme, etc.).</summary>
public class Setting
{
    public int SettingId { get; set; }
    public string SettingKey { get; set; } = string.Empty;
    public string? SettingValue { get; set; }
    public string? Description { get; set; }
    public DateTime ModifiedDate { get; set; } = DateTime.Now;
    public int? ModifiedBy { get; set; }
}
