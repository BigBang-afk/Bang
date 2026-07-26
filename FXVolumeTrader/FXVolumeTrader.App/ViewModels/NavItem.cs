namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Describes one entry in the sidebar navigation menu: display text, an
/// icon glyph (Segoe MDL2/Fluent icon font codepoint), and the view model
/// type NavigationService should resolve and activate when selected.
/// </summary>
public sealed class NavItem
{
    public required string Title { get; init; }

    public required string IconGlyph { get; init; }

    public required Type ViewModelType { get; init; }
}
