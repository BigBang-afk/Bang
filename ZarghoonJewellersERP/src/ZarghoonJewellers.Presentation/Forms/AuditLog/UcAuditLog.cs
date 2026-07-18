using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.AuditLog;

/// <summary>Read-only view over the immutable audit trail (logins, and every create/update/delete
/// the Business layer records via <see cref="IAuditService"/>).</summary>
public class UcAuditLog : UserControl, IAsyncLoadable
{
    private readonly IAuditService _auditService;
    private readonly DataGridView _grid;

    public UcAuditLog(IAuditService auditService)
    {
        _auditService = auditService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Audit Log", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var toolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundDark };
        var btnRefresh = new Guna2Button { Text = "⟳ Refresh", Location = new Point(0, 8), Size = new Size(100, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnRefresh.Click += async (_, _) => await LoadAsync();
        toolbar.Controls.Add(btnRefresh);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("Date", "Date/Time");
        _grid.Columns.Add("User", "User");
        _grid.Columns.Add("Action", "Action");
        _grid.Columns.Add("Table", "Table");
        _grid.Columns.Add("Record", "Record");
        _grid.Columns.Add("Details", "Details");

        Controls.Add(_grid);
        Controls.Add(toolbar);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        var entries = await _auditService.GetRecentAsync(300);
        _grid.Rows.Clear();
        foreach (var entry in entries)
            _grid.Rows.Add(entry.ActionDate.ToString("g"), entry.User?.FullName ?? "System", entry.ActionType,
                entry.TableName, entry.RecordId, entry.NewValues ?? entry.OldValues);
    }
}
