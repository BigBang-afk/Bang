using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Shell;

/// <summary>One entry in the sidebar: its identity, display text/icon, the permission module
/// that gates visibility, and a factory that lazily builds its content control on first visit.</summary>
public class ModuleDefinition
{
    public required string Key { get; init; }
    public required string DisplayName { get; init; }
    public required char IconLetter { get; init; }
    public Color IconColor { get; init; } = ThemeColors.GoldPrimary;
    public required string PermissionModule { get; init; }
    public required Func<Control> Factory { get; init; }
}
