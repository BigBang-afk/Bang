using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// A single dashboard KPI tile: icon badge, title, big value and an optional trend/subtitle
/// line. Reused for every stat card (Today's Sale, Cash in Hand, Gold in Hand, ...) so the
/// dashboard's layout code just creates one of these per metric instead of hand-building
/// a panel each time.
/// </summary>
public class StatCard : Guna2Panel
{
    private readonly PictureBox _iconBox;
    private readonly Label _titleLabel;
    private readonly Label _valueLabel;
    private readonly Label _subtitleLabel;

    public StatCard(string title, char iconLetter, Color accentColor)
    {
        Size = new Size(230, 110);
        FillColor = ThemeColors.BackgroundCard;
        BorderRadius = 12;
        Margin = new Padding(8);
        Padding = new Padding(16);

        _iconBox = new PictureBox
        {
            Size = new Size(40, 40),
            Location = new Point(16, 16),
            Image = IconFactory.CreateSquareBadge(iconLetter, accentColor, 40),
            SizeMode = PictureBoxSizeMode.AutoSize
        };

        _titleLabel = new Label
        {
            Text = title.ToUpperInvariant(),
            ForeColor = ThemeColors.TextMuted,
            Font = new Font("Segoe UI", 8F, FontStyle.Bold),
            Location = new Point(16, 64),
            AutoSize = true
        };

        _valueLabel = new Label
        {
            Text = "—",
            ForeColor = ThemeColors.TextPrimary,
            Font = ThemeColors.FontStatValue,
            Location = new Point(70, 20),
            AutoSize = true
        };

        _subtitleLabel = new Label
        {
            Text = string.Empty,
            ForeColor = ThemeColors.TextSecondary,
            Font = new Font("Segoe UI", 8F),
            Location = new Point(16, 84),
            AutoSize = true
        };

        Controls.Add(_iconBox);
        Controls.Add(_titleLabel);
        Controls.Add(_valueLabel);
        Controls.Add(_subtitleLabel);
    }

    public void SetValue(string value, string? subtitle = null)
    {
        _valueLabel.Text = value;
        _subtitleLabel.Text = subtitle ?? string.Empty;
    }
}
