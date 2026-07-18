using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Assembles the entire Dashboard screen's data in a single call so the UI issues one
/// await instead of orchestrating a dozen separate service calls itself. All queries share
/// the UnitOfWork's single DbContext, so they are awaited sequentially rather than via
/// Task.WhenAll - a DbContext instance is not safe for concurrent use.
/// </summary>
public class DashboardService : IDashboardService
{
    private const int ProfitTrendDays = 14;
    private const int RecentItemCount = 8;

    private readonly IUnitOfWork _unitOfWork;

    public DashboardService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var todaySale = await _unitOfWork.Invoices.GetTotalSalesForDateAsync(today, cancellationToken);
        var todayPurchase = await _unitOfWork.Purchases.GetTotalPurchasesForDateAsync(today, cancellationToken);
        var todayProfit = await CalculateProfitForDateAsync(today, cancellationToken);

        var cashInHand = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);
        var goldInHand = await GetGoldInHandGramsAsync(cancellationToken);

        var goldReceivable = await _unitOfWork.Suppliers.Query()
            .Where(s => s.IsActive && s.CurrentGoldBalance > 0)
            .SumAsync(s => s.CurrentGoldBalance, cancellationToken);

        var goldPayable = await _unitOfWork.Customers.Query()
            .Where(c => c.IsActive && c.CurrentGoldBalance > 0)
            .SumAsync(c => c.CurrentGoldBalance, cancellationToken);

        var karigarGold = await _unitOfWork.Karigars.Query()
            .Where(k => k.IsActive && k.CurrentGoldBalance < 0)
            .SumAsync(k => -k.CurrentGoldBalance, cancellationToken);

        var customerBalanceTotal = await _unitOfWork.Customers.GetTotalReceivableAsync(cancellationToken);
        var supplierBalanceTotal = await _unitOfWork.Suppliers.GetTotalPayableAsync(cancellationToken);
        var stockValue = await _unitOfWork.Stock.GetTotalStockValueAsync(cancellationToken);
        var lowStockItems = await _unitOfWork.Stock.GetLowStockItemsAsync(cancellationToken);

        var latestRate = await _unitOfWork.GoldRates.GetLatestAsync(cancellationToken);

        var pendingOrdersCount = await _unitOfWork.RepairOrders.CountPendingAsync(cancellationToken);
        var pendingPayments = await _unitOfWork.Invoices.Query()
            .Where(i => i.Status != "Cancelled" && i.BalanceAmount > 0)
            .SumAsync(i => i.BalanceAmount, cancellationToken);

        var recentInvoices = await _unitOfWork.Invoices.GetRecentAsync(RecentItemCount, cancellationToken);
        var recentCustomers = await _unitOfWork.Customers.GetRecentlyAddedAsync(6, cancellationToken);
        var pendingOrders = await _unitOfWork.RepairOrders.GetPendingAsync(6, cancellationToken);
        var profitTrend = await CalculateProfitTrendAsync(ProfitTrendDays, cancellationToken);

        return new DashboardSummaryDto
        {
            TodaySale = todaySale,
            TodayPurchase = todayPurchase,
            TodayProfit = todayProfit,
            CashInHand = cashInHand,
            GoldInHandGrams = goldInHand,
            GoldReceivableGrams = goldReceivable,
            GoldPayableGrams = goldPayable,
            KarigarGoldGrams = karigarGold,
            CustomerBalanceTotal = customerBalanceTotal,
            SupplierBalanceTotal = supplierBalanceTotal,
            StockValue = stockValue,
            LowStockCount = lowStockItems.Count,
            GoldRate22K = latestRate?.Rate22K ?? 0,
            GoldRate24K = latestRate?.Rate24K ?? 0,
            DollarRate = latestRate?.UsdToPkr ?? 0,
            GoldRateDate = latestRate?.RateDate ?? today,
            PendingOrdersCount = pendingOrdersCount,
            PendingPaymentsTotal = pendingPayments,
            RecentInvoices = recentInvoices
                .Select(i => new RecentTransactionDto(i.InvoiceNumber, i.InvoiceDate, i.Customer.FullName, i.TotalAmount, i.Status))
                .ToList(),
            RecentCustomers = recentCustomers
                .Select(c => new RecentCustomerDto(c.CustomerId, c.FullName, c.Phone, c.CurrentBalance, c.CreatedDate))
                .ToList(),
            PendingOrders = pendingOrders
                .Select(o => new PendingOrderDto(o.OrderNumber, o.Customer.FullName, o.ItemDescription, o.PromisedDate, o.Status))
                .ToList(),
            ProfitTrend = profitTrend
        };
    }

    private async Task<decimal> GetGoldInHandGramsAsync(CancellationToken cancellationToken)
        => await _unitOfWork.Stock.Query()
            .Where(s => s.IsActive && s.MetalType == "Gold")
            .SumAsync(s => s.NetWeight * s.Quantity, cancellationToken);

    /// <summary>Approximate gross profit = sale value of lines sold on <paramref name="date"/> minus their
    /// purchase-cost basis (Stock.PurchaseRate x net weight sold). Making charges and stone value are
    /// treated as pure margin since there is no separate manufacturing-cost ledger in this model.</summary>
    private async Task<decimal> CalculateProfitForDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = start.AddDays(1);

        var lines = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.Status != "Cancelled")
            .SelectMany(i => i.InvoiceDetails)
            .Select(d => new { d.LineTotal, d.NetWeight, d.Quantity, CostRate = d.Stock.PurchaseRate })
            .ToListAsync(cancellationToken);

        return lines.Sum(l => l.LineTotal - (l.NetWeight * l.Quantity * l.CostRate));
    }

    private async Task<IReadOnlyList<ProfitPointDto>> CalculateProfitTrendAsync(int days, CancellationToken cancellationToken)
    {
        var startDate = DateTime.Now.Date.AddDays(-(days - 1));

        var lines = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= startDate && i.Status != "Cancelled")
            .SelectMany(i => i.InvoiceDetails, (invoice, detail) => new { invoice.InvoiceDate, detail.LineTotal, detail.NetWeight, detail.Quantity, CostRate = detail.Stock.PurchaseRate })
            .ToListAsync(cancellationToken);

        var byDay = lines
            .GroupBy(l => l.InvoiceDate.Date)
            .ToDictionary(g => DateOnly.FromDateTime(g.Key), g => g.Sum(l => l.LineTotal - (l.NetWeight * l.Quantity * l.CostRate)));

        var result = new List<ProfitPointDto>();
        for (int i = 0; i < days; i++)
        {
            var day = DateOnly.FromDateTime(startDate.AddDays(i));
            result.Add(new ProfitPointDto(day, byDay.TryGetValue(day, out var profit) ? profit : 0m));
        }

        return result;
    }
}
