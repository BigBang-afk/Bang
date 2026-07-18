using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// One entry in the shell's sidebar navigation. Wraps a Guna2Button with a consistent icon
/// badge + label layout and an <see cref="IsActive"/> state that highlights the currently
/// open module with a gold left-accent and tinted background.
/// </summary>
public class SidebarNavButton : Guna2Button
{
    /// <summary>Key identifying which module this button opens (matches the keys registered in FrmMain's navigation map).</summary>
    public string ModuleKey { get; }

    private bool _isActive;
    public bool IsActive
    {
        get => _isActive;
        set
        {
            _isActive = value;
            ApplyVisualState();
        }
    }

    public SidebarNavButton(string moduleKey, string displayText, char iconLetter, Color iconColor)
    {
        ModuleKey = moduleKey;

        Dock = DockStyle.Top;
        Height = 46;
        Text = "   " + displayText;
        Font = new Font("Segoe UI", 10F);
        Image = IconFactory.CreateBadge(iconLetter, iconColor);
        BorderRadius = 8;
        Margin = new Padding(8, 2, 8, 2);
        Padding = new Padding(0);
        Animated = true;

        ApplyVisualState();
    }

    private void ApplyVisualState()
    {
        if (_isActive)
        {
            FillColor = ThemeColors.BackgroundHover;
            ForeColor = ThemeColors.GoldPrimary;
            BorderThickness = 0;
        }
        else
        {
            FillColor = Color.Transparent;
            ForeColor = ThemeColors.TextSecondary;
            BorderThickness = 0;
        }

        HoverState.FillColor = ThemeColors.BackgroundHover;
        HoverState.ForeColor = ThemeColors.TextPrimary;
    }
}
