using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// Stock Excel import wizard: download a starter template, pick a filled-in workbook, preview
/// every row with per-row validation (category/weight/etc.) before anything touches the
/// database, then import only the rows that passed. Column headers are matched by name (see
/// <see cref="StockImportColumns"/>), so column order in the spreadsheet doesn't matter.
/// </summary>
public class UcExcelImport : UserControl
{
    private readonly IStockService _stockService;
    private readonly DataGridView _grid;
    private readonly Label _lblSummary;
    private readonly Guna2Button _btnImport;

    private StockImportResult? _lastParseResult;

    public UcExcelImport(IStockService stockService)
    {
        _stockService = stockService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Excel Import", Dock = DockStyle.Top, Height = 34, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var instructions = new Label
        {
            Dock = DockStyle.Top, Height = 40, ForeColor = ThemeColors.TextSecondary, Font = new Font("Segoe UI", 8.5F),
            Text = "Download the template, fill it in (Category must match an existing stock category exactly), then choose the file to preview before importing."
        };

        var pnlToolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 48, FillColor = ThemeColors.BackgroundDark };
        var btnTemplate = new Guna2Button { Text = "⬇ Download Template", Location = new Point(0, 4), Size = new Size(170, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        var btnChooseFile = new Guna2Button { Text = "Choose File & Preview", Location = new Point(178, 4), Size = new Size(180, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _btnImport = new Guna2Button { Text = "Import Valid Rows", Location = new Point(366, 4), Size = new Size(160, 38), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold), Enabled = false };

        btnTemplate.Click += (_, _) => DownloadTemplate();
        btnChooseFile.Click += async (_, _) => await ChooseFileAndPreviewAsync();
        _btnImport.Click += async (_, _) => await ImportValidRowsAsync();

        pnlToolbar.Controls.Add(btnTemplate);
        pnlToolbar.Controls.Add(btnChooseFile);
        pnlToolbar.Controls.Add(_btnImport);

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
        _grid.Columns.Add("Row", "Row #");
        _grid.Columns.Add("ItemName", "Item Name");
        _grid.Columns.Add("Category", "Category");
        _grid.Columns.Add("GrossWeight", "Gross Wt");
        _grid.Columns.Add("Status", "Status");
        _grid.Columns.Add("Errors", "Details");
        _grid.Columns["Row"].Width = 60;
        _grid.Columns["Status"].Width = 80;

        _lblSummary = new Label { Dock = DockStyle.Bottom, Height = 28, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };

        Controls.Add(_grid);
        Controls.Add(_lblSummary);
        Controls.Add(pnlToolbar);
        Controls.Add(instructions);
        Controls.Add(titleLabel);
    }

    private void DownloadTemplate()
    {
        using var dialog = new SaveFileDialog { Filter = "Excel Workbook|*.xlsx", FileName = "StockImportTemplate.xlsx" };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        ExcelHelper.ExportTemplate(dialog.FileName, "Stock Import", StockImportColumns.AllHeaders, StockImportColumns.SampleRow);
        MessageBox.Show(this, "Template saved. Fill it in and use 'Choose File & Preview' to import it.", "Excel Import", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private async Task ChooseFileAndPreviewAsync()
    {
        using var dialog = new OpenFileDialog { Filter = "Excel Workbook|*.xlsx" };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await using var stream = File.OpenRead(dialog.FileName);
            _lastParseResult = await _stockService.ParseExcelImportAsync(stream);
            RenderPreview(_lastParseResult);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Could not read the workbook: {ex.Message}", "Excel Import", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private void RenderPreview(StockImportResult result)
    {
        _grid.Rows.Clear();
        foreach (var row in result.Rows)
        {
            var rowIndex = _grid.Rows.Add(
                row.RowNumber,
                row.ItemNameRaw,
                row.CategoryNameRaw,
                row.Stock?.GrossWeight.ToString("N3") ?? string.Empty,
                row.IsValid ? "Valid" : "Error",
                string.Join("; ", row.Errors));

            _grid.Rows[rowIndex].DefaultCellStyle.ForeColor = row.IsValid ? ThemeColors.Success : ThemeColors.Danger;
        }

        _lblSummary.Text = $"{result.ValidCount} row(s) ready to import, {result.InvalidCount} row(s) with errors.";
        _btnImport.Enabled = result.ValidCount > 0;
    }

    private async Task ImportValidRowsAsync()
    {
        if (_lastParseResult is null) return;

        var validItems = _lastParseResult.Rows.Where(r => r.IsValid).Select(r => r.Stock!).ToList();
        if (validItems.Count == 0) return;

        var confirm = MessageBox.Show(this, $"Import {validItems.Count} item(s) into inventory?", "Excel Import", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        try
        {
            var saved = await _stockService.BulkCreateAsync(validItems);
            MessageBox.Show(this, $"{saved.Count} item(s) imported successfully.", "Excel Import", MessageBoxButtons.OK, MessageBoxIcon.Information);

            _grid.Rows.Clear();
            _lastParseResult = null;
            _btnImport.Enabled = false;
            _lblSummary.Text = string.Empty;
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not import", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
