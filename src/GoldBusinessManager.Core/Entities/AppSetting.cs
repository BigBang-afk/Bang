using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

/// <summary>
/// Single-row table (Id is always 1) holding shop-wide configuration.
/// </summary>
[Table("Settings")]
public class AppSetting
{
    [PrimaryKey]
    public int Id { get; set; } = 1;

    [MaxLength(150)]
    public string ShopName { get; set; } = "My 24K Gold Shop";

    [MaxLength(250)]
    public string? ShopAddress { get; set; }

    [MaxLength(20)]
    public string? ShopPhone { get; set; }

    /// <summary>Local file path to the logo image, copied into app data storage.</summary>
    [MaxLength(500)]
    public string? ShopLogoPath { get; set; }

    public WeightUnit DefaultWeightUnit { get; set; } = WeightUnit.Gram;

    /// <summary>24K gold rate per gram pre-filled on new sales/purchase forms.</summary>
    public double DefaultGoldRatePerGram { get; set; }

    public bool IsDarkMode { get; set; }

    public DateTime? LastBackupDate { get; set; }
}
