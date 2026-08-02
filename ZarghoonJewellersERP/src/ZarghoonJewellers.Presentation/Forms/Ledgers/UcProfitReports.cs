using System.Windows.Forms.DataVisualization.Charting;
using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Ledgers;

/// <summary>
/// Profit Calculation: by Item, by Category, by Employee, and a Daily/Weekly/Monthly/Yearly
/// profit-over-time chart - all derived from confirmed sale invoices in the selected date range
/// via <see cref="IProfitReportService"/>.
/// </summary>
public class UcProfitReports : UserControl, IAsyncLoadable
{
    private readonly IProfitReportService _profitReportService;

    private readonly Guna2DateTimePicker _dtFrom;
    private readonly Guna2DateTimePicker _dtTo;
    private readonly Guna2ComboBox _cmbPeriod;
    private readonly DataGridView _gridByItem;
    private readonly DataGridView _gridByCategory;
    private readonly DataGridView _gridByEmployee;
    private readonly Chart _chartOverTime;
    private readonly DataGridView _gridOverTime;
    private readonly Label _lblTotalProfit;

    public UcProfitReports(IProfitReportService profitReportService)
    {
        _profitReportService = profitReportService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Profit Reports", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlFilters = new Guna2Panel { Dock = DockStyle.Top, Height = 68, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        Label MakeCaption(string text, int x) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, 8), AutoSize = true };

        pnlFilters.Controls.Add(MakeCaption("FROM", 16));
        _dtFrom = new Guna2DateTimePicker { Location = new Point(16, 26), Size = new Size(150, 36), Value = DateTime.Now.AddMonths(-1) };
        pnlFilters.Controls.Add(_dtFrom);

        pnlFilters.Controls.Add(MakeCaption("TO", 182));
        _dtTo = new Guna2DateTimePicker { Location = new Point(182, 26), Size = new Size(150, 36), Value = DateTime.Now };
        pnlFilters.Controls.Add(_dtTo);

        pnlFilters.Controls.Add(MakeCaption("TREND PERIOD", 348));
        _cmbPeriod = new Guna2ComboBox { Location = new Point(348, 26), Size = new Size(130, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbPeriod.DataSource = Enum.GetValues<ProfitPeriod>();
        pnlFilters.Controls.Add(_cmbPeriod);

        var btnRun = new Guna2Button { Text = "RUN REPORT", Location = new Point(494, 24), Size = new Size(140, 40), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold) };
        btnRun.Click += async (_, _) => await RunReportsAsync();
        pnlFilters.Controls.Add(btnRun);

        _lblTotalProfit = new Label { Text = "Total Profit: —", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 13F, FontStyle.Bold), Location = new Point(660, 30), AutoSize = true };
        pnlFilters.Controls.Add(_lblTotalProfit);

        var tabs = new TabControl { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9.5F) };

        var tabItem = new TabPage("By Item") { BackColor = ThemeColors.BackgroundDark };
        _gridByItem = BuildGrid();
        _gridByItem.Columns.Add("Code", "Item Code");
        _gridByItem.Columns.Add("Name", "Item Name");
        _gridByItem.Columns.Add("Qty", "Qty Sold");
        _gridByItem.Columns.Add("Revenue", "Revenue");
        _gridByItem.Columns.Add("Cost", "Cost");
        _gridByItem.Columns.Add("Profit", "Profit");
        tabItem.Controls.Add(_gridByItem);

        var tabCategory = new TabPage("By Category") { BackColor = ThemeColors.BackgroundDark };
        _gridByCategory = BuildGrid();
        _gridByCategory.Columns.Add("Category", "Category");
        _gridByCategory.Columns.Add("Qty", "Qty Sold");
        _gridByCategory.Columns.Add("Revenue", "Revenue");
        _gridByCategory.Columns.Add("Cost", "Cost");
        _gridByCategory.Columns.Add("Profit", "Profit");
        tabCategory.Controls.Add(_gridByCategory);

        var tabEmployee = new TabPage("By Employee") { BackColor = ThemeColors.BackgroundDark };
        _gridByEmployee = BuildGrid();
        _gridByEmployee.Columns.Add("Employee", "Employee");
        _gridByEmployee.Columns.Add("Invoices", "Invoice Count");
        _gridByEmployee.Columns.Add("Revenue", "Revenue");
        _gridByEmployee.Columns.Add("Cost", "Cost");
        _gridByEmployee.Columns.Add("Profit", "Profit");
        tabEmployee.Controls.Add(_gridByEmployee);

        var tabTrend = new TabPage("Daily / Weekly / Monthly / Yearly") { BackColor = ThemeColors.BackgroundDark };
        _chartOverTime = new Chart { Dock = DockStyle.Top, Height = 300, BackColor = ThemeColors.BackgroundDark };
        ConfigureChart();
        _gridOverTime = BuildGrid();
        _gridOverTime.Dock = DockStyle.Fill;
        _gridOverTime.Columns.Add("Period", "Period");
        _gridOverTime.Columns.Add("Revenue", "Revenue");
        _gridOverTime.Columns.Add("Cost", "Cost");
        _gridOverTime.Columns.Add("Profit", "Profit");
        tabTrend.Controls.Add(_gridOverTime);
        tabTrend.Controls.Add(_chartOverTime);

        tabs.TabPages.Add(tabItem);
        tabs.TabPages.Add(tabCategory);
        tabs.TabPages.Add(tabEmployee);
        tabs.TabPages.Add(tabTrend);

        Controls.Add(tabs);
        Controls.Add(pnlFilters);
        Controls.Add(titleLabel);
    }

    private static DataGridView BuildGrid()
    {
        var grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        return grid;
    }

    private void ConfigureChart()
    {
        _chartOverTime.ChartAreas.Clear();
        var area = new ChartArea("ProfitTrendArea") { BackColor = ThemeColors.BackgroundCard };
        area.AxisX.LabelStyle.ForeColor = ThemeColors.TextSecondary;
        area.AxisY.LabelStyle.ForeColor = ThemeColors.TextSecondary;
        area.AxisX.MajorGrid.LineColor = ThemeColors.BorderSubtle;
        area.AxisY.MajorGrid.LineColor = ThemeColors.BorderSubtle;
        area.AxisX.LineColor = ThemeColors.BorderSubtle;
        area.AxisY.LineColor = ThemeColors.BorderSubtle;
        _chartOverTime.ChartAreas.Add(area);

        _chartOverTime.Series.Clear();
        _chartOverTime.Series.Add(new Series("Revenue") { ChartType = SeriesChartType.Column, Color = Color.FromArgb(150, ThemeColors.Info), XValueType = ChartValueType.String });
        _chartOverTime.Series.Add(new Series("Profit") { ChartType = SeriesChartType.Line, Color = ThemeColors.GoldPrimary, BorderWidth = 3, XValueType = ChartValueType.String });

        _chartOverTime.Legends.Clear();
        _chartOverTime.Legends.Add(new Legend { ForeColor = ThemeColors.TextSecondary, BackColor = Color.Transparent });
    }

    public Task LoadAsync() => RunReportsAsync();

    private async Task RunReportsAsync()
    {
        var fromDate = DateOnly.FromDateTime(_dtFrom.Value);
        var toDate = DateOnly.FromDateTime(_dtTo.Value);
        var period = _cmbPeriod.SelectedItem is ProfitPeriod p ? p : ProfitPeriod.Daily;

        var byItem = await _profitReportService.GetProfitByItemAsync(fromDate, toDate);
        _gridByItem.Rows.Clear();
        foreach (var r in byItem)
            _gridByItem.Rows.Add(r.ItemCode, r.ItemName, r.QuantitySold, r.Revenue.ToString("N0"), r.Cost.ToString("N0"), r.Profit.ToString("N0"));

        var byCategory = await _profitReportService.GetProfitByCategoryAsync(fromDate, toDate);
        _gridByCategory.Rows.Clear();
        foreach (var r in byCategory)
            _gridByCategory.Rows.Add(r.CategoryName, r.QuantitySold, r.Revenue.ToString("N0"), r.Cost.ToString("N0"), r.Profit.ToString("N0"));

        var byEmployee = await _profitReportService.GetProfitByEmployeeAsync(fromDate, toDate);
        _gridByEmployee.Rows.Clear();
        foreach (var r in byEmployee)
            _gridByEmployee.Rows.Add(r.EmployeeName, r.InvoiceCount, r.Revenue.ToString("N0"), r.Cost.ToString("N0"), r.Profit.ToString("N0"));

        var overTime = await _profitReportService.GetProfitOverTimeAsync(period, fromDate, toDate);
        _gridOverTime.Rows.Clear();
        _chartOverTime.Series["Revenue"].Points.Clear();
        _chartOverTime.Series["Profit"].Points.Clear();
        foreach (var point in overTime)
        {
            _gridOverTime.Rows.Add(point.PeriodLabel, point.Revenue.ToString("N0"), point.Cost.ToString("N0"), point.Profit.ToString("N0"));
            _chartOverTime.Series["Revenue"].Points.AddXY(point.PeriodLabel, point.Revenue);
            _chartOverTime.Series["Profit"].Points.AddXY(point.PeriodLabel, point.Profit);
        }

        _lblTotalProfit.Text = $"Total Profit: {byItem.Sum(r => r.Profit):C0}";
    }
}
