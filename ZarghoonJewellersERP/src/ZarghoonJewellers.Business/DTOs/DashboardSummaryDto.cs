namespace ZarghoonJewellers.Business.DTOs;

/// <summary>Everything the Dashboard screen needs, assembled in one round-trip by <see cref="Interfaces.IDashboardService"/>
/// so the UI never has to orchestrate multiple service calls just to paint the stat cards.</summary>
public class DashboardSummaryDto
{
    public decimal TodaySale { get; set; }
    public decimal TodayPurchase { get; set; }
    public decimal TodayProfit { get; set; }
    public decimal CashInHand { get; set; }
    public decimal GoldInHandGrams { get; set; }
    public decimal GoldReceivableGrams { get; set; }
    public decimal GoldPayableGrams { get; set; }
    public decimal KarigarGoldGrams { get; set; }
    public decimal CustomerBalanceTotal { get; set; }
    public decimal SupplierBalanceTotal { get; set; }
    public decimal StockValue { get; set; }
    public int LowStockCount { get; set; }
    public decimal GoldRate22K { get; set; }
    public decimal GoldRate24K { get; set; }
    public decimal DollarRate { get; set; }
    public DateOnly GoldRateDate { get; set; }
    public int PendingOrdersCount { get; set; }
    public decimal PendingPaymentsTotal { get; set; }

    public IReadOnlyList<RecentTransactionDto> RecentInvoices { get; set; } = Array.Empty<RecentTransactionDto>();
    public IReadOnlyList<RecentCustomerDto> RecentCustomers { get; set; } = Array.Empty<RecentCustomerDto>();
    public IReadOnlyList<PendingOrderDto> PendingOrders { get; set; } = Array.Empty<PendingOrderDto>();
    public IReadOnlyList<ProfitPointDto> ProfitTrend { get; set; } = Array.Empty<ProfitPointDto>();
}

public record RecentTransactionDto(string InvoiceNumber, DateTime Date, string CustomerName, decimal Amount, string Status);

public record RecentCustomerDto(int CustomerId, string FullName, string? Phone, decimal CurrentBalance, DateTime CreatedDate);

public record PendingOrderDto(string OrderNumber, string CustomerName, string ItemDescription, DateOnly? PromisedDate, string Status);

public record ProfitPointDto(DateOnly Date, decimal Profit);
