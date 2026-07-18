using System.Windows.Forms.DataVisualization.Charting;
using Guna.UI2.WinForms;

namespace ZarghoonJewellers.Presentation.Forms.Dashboard;

partial class UcDashboard
{
    private System.ComponentModel.IContainer components = null!;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null)) components.Dispose();
        base.Dispose(disposing);
    }

    private Guna2Panel pnlRoot = null!;
    private FlowLayoutPanel flowStatCards = null!;
    private Guna2Panel pnlChart = null!;
    private Label lblChartTitle = null!;
    private Chart chartProfit = null!;
    private TableLayoutPanel tblLists = null!;
    private Guna2Panel pnlRecentTransactions = null!;
    private Label lblRecentTransactionsTitle = null!;
    private DataGridView gridRecentTransactions = null!;
    private Guna2Panel pnlRecentCustomers = null!;
    private Label lblRecentCustomersTitle = null!;
    private DataGridView gridRecentCustomers = null!;
    private Guna2Panel pnlPendingOrders = null!;
    private Label lblPendingOrdersTitle = null!;
    private DataGridView gridPendingOrders = null!;

    private void InitializeComponent()
    {
        components = new System.ComponentModel.Container();
        pnlRoot = new Guna2Panel();
        flowStatCards = new FlowLayoutPanel();
        pnlChart = new Guna2Panel();
        lblChartTitle = new Label();
        chartProfit = new Chart();
        tblLists = new TableLayoutPanel();
        pnlRecentTransactions = new Guna2Panel();
        lblRecentTransactionsTitle = new Label();
        gridRecentTransactions = new DataGridView();
        pnlRecentCustomers = new Guna2Panel();
        lblRecentCustomersTitle = new Label();
        gridRecentCustomers = new DataGridView();
        pnlPendingOrders = new Guna2Panel();
        lblPendingOrdersTitle = new Label();
        gridPendingOrders = new DataGridView();

        ((System.ComponentModel.ISupportInitialize)chartProfit).BeginInit();
        ((System.ComponentModel.ISupportInitialize)gridRecentTransactions).BeginInit();
        ((System.ComponentModel.ISupportInitialize)gridRecentCustomers).BeginInit();
        ((System.ComponentModel.ISupportInitialize)gridPendingOrders).BeginInit();
        SuspendLayout();

        // pnlRoot: scrollable container so the dashboard degrades gracefully on smaller screens
        pnlRoot.Dock = DockStyle.Fill;
        pnlRoot.AutoScroll = true;
        pnlRoot.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;
        pnlRoot.Padding = new Padding(20);

        // flowStatCards
        flowStatCards.FlowDirection = FlowDirection.LeftToRight;
        flowStatCards.WrapContents = true;
        flowStatCards.AutoSize = true;
        flowStatCards.AutoSizeMode = AutoSizeMode.GrowAndShrink;
        flowStatCards.Dock = DockStyle.Top;
        flowStatCards.Location = new Point(20, 20);

        // pnlChart
        pnlChart.Dock = DockStyle.Top;
        pnlChart.Height = 320;
        pnlChart.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        pnlChart.BorderRadius = 12;
        pnlChart.Margin = new Padding(0, 16, 0, 16);
        pnlChart.Padding = new Padding(20);

        lblChartTitle.Text = "TODAY'S PROFIT TREND (LAST 14 DAYS)";
        lblChartTitle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        lblChartTitle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        lblChartTitle.Dock = DockStyle.Top;
        lblChartTitle.Height = 30;
        lblChartTitle.TextAlign = ContentAlignment.MiddleLeft;

        chartProfit.Dock = DockStyle.Fill;
        chartProfit.BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;

        pnlChart.Controls.Add(chartProfit);
        pnlChart.Controls.Add(lblChartTitle);

        // tblLists: three list panels side by side
        tblLists.Dock = DockStyle.Top;
        tblLists.Height = 340;
        tblLists.ColumnCount = 3;
        tblLists.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 34F));
        tblLists.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33F));
        tblLists.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33F));

        ConfigureListPanel(pnlRecentTransactions, lblRecentTransactionsTitle, gridRecentTransactions, "RECENT TRANSACTIONS");
        ConfigureListPanel(pnlRecentCustomers, lblRecentCustomersTitle, gridRecentCustomers, "RECENT CUSTOMERS");
        ConfigureListPanel(pnlPendingOrders, lblPendingOrdersTitle, gridPendingOrders, "PENDING ORDERS");

        tblLists.Controls.Add(pnlRecentTransactions, 0, 0);
        tblLists.Controls.Add(pnlRecentCustomers, 1, 0);
        tblLists.Controls.Add(pnlPendingOrders, 2, 0);

        pnlRoot.Controls.Add(tblLists);
        pnlRoot.Controls.Add(pnlChart);
        pnlRoot.Controls.Add(flowStatCards);

        Controls.Add(pnlRoot);
        Dock = DockStyle.Fill;
        BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;

        ((System.ComponentModel.ISupportInitialize)chartProfit).EndInit();
        ((System.ComponentModel.ISupportInitialize)gridRecentTransactions).EndInit();
        ((System.ComponentModel.ISupportInitialize)gridRecentCustomers).EndInit();
        ((System.ComponentModel.ISupportInitialize)gridPendingOrders).EndInit();
        ResumeLayout(false);
    }

    private static void ConfigureListPanel(Guna2Panel panel, Label title, DataGridView grid, string titleText)
    {
        panel.Dock = DockStyle.Fill;
        panel.Margin = new Padding(6);
        panel.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        panel.BorderRadius = 12;
        panel.Padding = new Padding(12);

        title.Text = titleText;
        title.Dock = DockStyle.Top;
        title.Height = 28;
        title.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        title.Font = new Font("Segoe UI", 9F, FontStyle.Bold);

        grid.Dock = DockStyle.Fill;
        grid.BackgroundColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        grid.BorderStyle = BorderStyle.None;
        grid.RowHeadersVisible = false;
        grid.AllowUserToAddRows = false;
        grid.AllowUserToDeleteRows = false;
        grid.ReadOnly = true;
        grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        grid.EnableHeadersVisualStyles = false;
        grid.GridColor = ZarghoonJewellers.Common.Theming.ThemeColors.BorderSubtle;
        grid.ColumnHeadersDefaultCellStyle.BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundPanel;
        grid.ColumnHeadersDefaultCellStyle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
        grid.DefaultCellStyle.BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        grid.DefaultCellStyle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        grid.DefaultCellStyle.SelectionBackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        grid.DefaultCellStyle.SelectionForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        grid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing;
        grid.ColumnHeadersHeight = 32;
        grid.RowTemplate.Height = 30;
        grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;

        panel.Controls.Add(grid);
        panel.Controls.Add(title);
    }
}
