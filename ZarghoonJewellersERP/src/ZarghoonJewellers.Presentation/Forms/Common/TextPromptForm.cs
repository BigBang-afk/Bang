using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Common;

/// <summary>Small single-field text prompt (e.g. "Hold Label") - a lightweight stand-in for
/// VB's InputBox that follows the app's dark-gold theme.</summary>
public class TextPromptForm : Form
{
    private readonly Guna2TextBox _txtValue;

    public string Value => _txtValue.Text.Trim();

    public TextPromptForm(string title, string prompt, string defaultValue = "")
    {
        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(360, 170);
        Font = new Font("Segoe UI", 9.5f);

        Controls.Add(new Label { Text = prompt, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold), Location = new Point(20, 18), AutoSize = true });

        _txtValue = new Guna2TextBox
        {
            Text = defaultValue, Location = new Point(20, 40), Size = new Size(320, 38),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6
        };
        Controls.Add(_txtValue);

        var btnOk = new Guna2Button
        {
            Text = "OK", Location = new Point(20, 100), Size = new Size(150, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        var btnCancel = new Guna2Button
        {
            Text = "Cancel", Location = new Point(190, 100), Size = new Size(150, 42),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8,
            DialogResult = DialogResult.Cancel
        };

        Controls.Add(btnOk);
        Controls.Add(btnCancel);
        AcceptButton = btnOk;
        CancelButton = btnCancel;
    }
}
