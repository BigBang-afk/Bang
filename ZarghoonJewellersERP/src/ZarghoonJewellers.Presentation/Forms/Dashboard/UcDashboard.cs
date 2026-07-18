using System.Windows.Forms.DataVisualization.Charting;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Controls;

namespace ZarghoonJewellers.Presentation.Forms.Dashboard;

/// <summary>
/// The landing screen after login: today's headline numbers, cash/gold position, stock
/// health, the profit trend chart and the three "what needs my attention" lists. All data
/// comes from a single <see cref="IDashboardService.GetSummaryAsync"/> call.
/// </summary>
public partial class UcDashboard : UserControl
{
    private readonly IDashboardService _dashboardService;

    private readonly StatCard _cardTodaySale;
    private readonly StatCard _cardTodayPurchase;
    private readonly StatCard _cardTodayProfit;
    private readonly StatCard _cardCashInHand;
    private readonly StatCard _cardGoldInHand;
    private readonly StatCard _cardGoldReceivable;
    private readonly StatCard _cardGoldPayable;
    private readonly StatCard _cardKarigarGold;
    private readonly StatCard _cardCustomerBalance;
    private readonly StatCard _cardStockValue;
    private readonly StatCard _cardLowStock;
    private readonly StatCard _cardGoldRate;
    private readonly StatCard _cardDollarRate;
    private readonly StatCard _cardPendingPayments;

    public UcDashboard(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
        InitializeComponent();

        _cardTodaySale = AddCard("Today's Sale", 'S', ThemeColors.Success);
        _cardTodayPurchase = AddCard("Today's Purchase", 'P', ThemeColors.Info);
        _cardTodayProfit = AddCard("Today's Profit", 'F', ThemeColors.GoldPrimary);
        _cardCashInHand = AddCard("Cash in Hand", 'C', ThemeColors.Success);
        _cardGoldInHand = AddCard("Gold in Hand", 'G', ThemeColors.GoldPrimary);
        _cardGoldReceivable = AddCard("Gold Receivable", 'R', ThemeColors.Info);
        _cardGoldPayable = AddCard("Gold Payable", 'Y', ThemeColors.Warning);
        _cardKarigarGold = AddCard("Karigar Gold", 'K', ThemeColors.GoldDark);
        _cardCustomerBalance = AddCard("Customer Balance", 'B', ThemeColors.Info);
        _cardStockValue = AddCard("Stock Value", 'V', ThemeColors.GoldPrimary);
        _cardLowStock = AddCard("Low Stock Alert", '!', ThemeColors.Danger);
        _cardGoldRate = AddCard("Gold Rate (22K)", 'Z', ThemeColors.GoldPrimary);
        _cardDollarRate = AddCard("Dollar Rate", '$', ThemeColors.Success);
        _cardPendingPayments = AddCard("Pending Payments", 'D', ThemeColors.Warning);

        ConfigureChart();
        ConfigureGridColumns();

        Load += async (_, _) => await LoadAsync();
    }

    private StatCard AddCard(string title, char icon, Color accent)
    {
        var card = new StatCard(title, icon, accent);
        flowStatCards.Controls.Add(card);
        return card;
    }

    private void ConfigureChart()
    {
        chartProfit.ChartAreas.Clear();
        var area = new ChartArea("ProfitArea")
        {
            BackColor = ThemeColors.BackgroundCard,
        };
        area.AxisX.LabelStyle.ForeColor = ThemeColors.TextSecondary;
        area.AxisY.LabelStyle.ForeColor = ThemeColors.TextSecondary;
        area.AxisX.MajorGrid.LineColor = ThemeColors.BorderSubtle;
        area.AxisY.MajorGrid.LineColor = ThemeColors.BorderSubtle;
        area.AxisX.LineColor = ThemeColors.BorderSubtle;
        area.AxisY.LineColor = ThemeColors.BorderSubtle;
        chartProfit.ChartAreas.Add(area);

        chartProfit.Series.Clear();
        var series = new Series("Profit")
        {
            ChartType = SeriesChartType.SplineArea,
            Color = Color.FromArgb(90, ThemeColors.GoldPrimary),
            BorderColor = ThemeColors.GoldPrimary,
            BorderWidth = 2,
            XValueType = ChartValueType.String
        };
        chartProfit.Series.Add(series);
        chartProfit.Legends.Clear();
    }

    private void ConfigureGridColumns()
    {
        gridRecentTransactions.Columns.Clear();
        gridRecentTransactions.Columns.Add("Invoice", "Invoice #");
        gridRecentTransactions.Columns.Add("Customer", "Customer");
        gridRecentTransactions.Columns.Add("Amount", "Amount");

        gridRecentCustomers.Columns.Clear();
        gridRecentCustomers.Columns.Add("Name", "Name");
        gridRecentCustomers.Columns.Add("Phone", "Phone");
        gridRecentCustomers.Columns.Add("Balance", "Balance");

        gridPendingOrders.Columns.Clear();
        gridPendingOrders.Columns.Add("Order", "Order #");
        gridPendingOrders.Columns.Add("Item", "Item");
        gridPendingOrders.Columns.Add("Due", "Due");
    }

    public async Task LoadAsync()
    {
        DashboardSummaryDto summary;
        try
        {
            summary = await _dashboardService.GetSummaryAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Could not load dashboard data:\n{ex.Message}", "Dashboard",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        _cardTodaySale.SetValue(summary.TodaySale.ToString("C0"));
        _cardTodayPurchase.SetValue(summary.TodayPurchase.ToString("C0"));
        _cardTodayProfit.SetValue(summary.TodayProfit.ToString("C0"));
        _cardCashInHand.SetValue(summary.CashInHand.ToString("C0"));
        _cardGoldInHand.SetValue($"{summary.GoldInHandGrams:N2} g");
        _cardGoldReceivable.SetValue($"{summary.GoldReceivableGrams:N2} g");
        _cardGoldPayable.SetValue($"{summary.GoldPayableGrams:N2} g");
        _cardKarigarGold.SetValue($"{summary.KarigarGoldGrams:N2} g");
        _cardCustomerBalance.SetValue(summary.CustomerBalanceTotal.ToString("C0"));
        _cardStockValue.SetValue(summary.StockValue.ToString("C0"));
        _cardLowStock.SetValue(summary.LowStockCount.ToString(), summary.LowStockCount > 0 ? "Needs reorder" : "All good");
        _cardGoldRate.SetValue(summary.GoldRate22K.ToString("C0"), $"/gram · {summary.GoldRateDate:d}");
        _cardDollarRate.SetValue(summary.DollarRate.ToString("C2"), "PKR / USD");
        _cardPendingPayments.SetValue(summary.PendingPaymentsTotal.ToString("C0"), $"{summary.PendingOrdersCount} open orders");

        PopulateChart(summary.ProfitTrend);
        PopulateTransactions(summary.RecentInvoices);
        PopulateCustomers(summary.RecentCustomers);
        PopulateOrders(summary.PendingOrders);
    }

    private void PopulateChart(IReadOnlyList<ProfitPointDto> points)
    {
        var series = chartProfit.Series["Profit"];
        series.Points.Clear();
        foreach (var point in points)
        {
            var index = series.Points.AddXY(point.Date.ToString("MMM dd"), point.Profit);
            series.Points[index].Color = ThemeColors.GoldPrimary;
        }
    }

    private void PopulateTransactions(IReadOnlyList<RecentTransactionDto> transactions)
    {
        gridRecentTransactions.Rows.Clear();
        foreach (var t in transactions)
            gridRecentTransactions.Rows.Add(t.InvoiceNumber, t.CustomerName, t.Amount.ToString("C0"));
    }

    private void PopulateCustomers(IReadOnlyList<RecentCustomerDto> customers)
    {
        gridRecentCustomers.Rows.Clear();
        foreach (var c in customers)
            gridRecentCustomers.Rows.Add(c.FullName, c.Phone ?? "-", c.CurrentBalance.ToString("C0"));
    }

    private void PopulateOrders(IReadOnlyList<PendingOrderDto> orders)
    {
        gridPendingOrders.Rows.Clear();
        foreach (var o in orders)
            gridPendingOrders.Rows.Add(o.OrderNumber, o.ItemDescription, o.PromisedDate?.ToString("d") ?? "-");
    }
}
