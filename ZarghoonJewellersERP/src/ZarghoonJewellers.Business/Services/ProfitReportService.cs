using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Profit-by-item/category/employee and profit-over-time reports, all derived from confirmed
/// sale invoices in a date range. Cost is approximated the same way the Dashboard does
/// (Stock.PurchaseRate x net weight sold) since there's no separate manufacturing cost ledger.
/// </summary>
public class ProfitReportService : IProfitReportService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProfitReportService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ProfitByItemDto>> GetProfitByItemAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        var (start, end) = ToRange(fromDate, toDate);

        var rows = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.InvoiceType == "Sale" && i.Status != "Cancelled")
            .SelectMany(i => i.InvoiceDetails)
            .GroupBy(d => new { d.StockId, d.Stock.ItemCode, d.Stock.ItemName })
            .Select(g => new
            {
                g.Key.StockId,
                g.Key.ItemCode,
                g.Key.ItemName,
                Quantity = g.Sum(d => d.Quantity),
                Revenue = g.Sum(d => d.LineTotal),
                Cost = g.Sum(d => d.NetWeight * d.Quantity * d.Stock.PurchaseRate)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new ProfitByItemDto(r.StockId, r.ItemCode, r.ItemName, r.Quantity, r.Revenue, r.Cost, r.Revenue - r.Cost))
            .OrderByDescending(r => r.Profit)
            .ToList();
    }

    public async Task<IReadOnlyList<ProfitByCategoryDto>> GetProfitByCategoryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        var (start, end) = ToRange(fromDate, toDate);

        var rows = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.InvoiceType == "Sale" && i.Status != "Cancelled")
            .SelectMany(i => i.InvoiceDetails)
            .GroupBy(d => new { d.Stock.CategoryId, d.Stock.Category.CategoryName })
            .Select(g => new
            {
                g.Key.CategoryId,
                g.Key.CategoryName,
                Quantity = g.Sum(d => d.Quantity),
                Revenue = g.Sum(d => d.LineTotal),
                Cost = g.Sum(d => d.NetWeight * d.Quantity * d.Stock.PurchaseRate)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(r => new ProfitByCategoryDto(r.CategoryId, r.CategoryName, r.Quantity, r.Revenue, r.Cost, r.Revenue - r.Cost))
            .OrderByDescending(r => r.Profit)
            .ToList();
    }

    public async Task<IReadOnlyList<ProfitByEmployeeDto>> GetProfitByEmployeeAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        var (start, end) = ToRange(fromDate, toDate);

        var rows = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.InvoiceType == "Sale" && i.Status != "Cancelled")
            .Select(i => new
            {
                i.CreatedBy,
                EmployeeName = i.CreatedByUser.FullName,
                i.InvoiceId,
                Revenue = i.TotalAmount,
                Cost = i.InvoiceDetails.Sum(d => d.NetWeight * d.Quantity * d.Stock.PurchaseRate)
            })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(r => new { r.CreatedBy, r.EmployeeName })
            .Select(g => new ProfitByEmployeeDto(g.Key.CreatedBy, g.Key.EmployeeName, g.Count(), g.Sum(r => r.Revenue), g.Sum(r => r.Cost), g.Sum(r => r.Revenue) - g.Sum(r => r.Cost)))
            .OrderByDescending(r => r.Profit)
            .ToList();
    }

    public async Task<IReadOnlyList<ProfitPeriodPointDto>> GetProfitOverTimeAsync(ProfitPeriod period, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        var (start, end) = ToRange(fromDate, toDate);

        var rows = await _unitOfWork.Invoices.Query()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.InvoiceType == "Sale" && i.Status != "Cancelled")
            .Select(i => new
            {
                i.InvoiceDate,
                Revenue = i.TotalAmount,
                Cost = i.InvoiceDetails.Sum(d => d.NetWeight * d.Quantity * d.Stock.PurchaseRate)
            })
            .ToListAsync(cancellationToken);

        var grouped = rows
            .GroupBy(r => GetPeriodStart(DateOnly.FromDateTime(r.InvoiceDate), period))
            .Select(g => new ProfitPeriodPointDto(FormatLabel(g.Key, period), g.Key, g.Sum(r => r.Revenue), g.Sum(r => r.Cost), g.Sum(r => r.Revenue) - g.Sum(r => r.Cost)))
            .OrderBy(p => p.PeriodStart)
            .ToList();

        return grouped;
    }

    private static (DateTime Start, DateTime End) ToRange(DateOnly fromDate, DateOnly toDate)
        => (fromDate.ToDateTime(TimeOnly.MinValue), toDate.AddDays(1).ToDateTime(TimeOnly.MinValue));

    private static DateOnly GetPeriodStart(DateOnly date, ProfitPeriod period) => period switch
    {
        ProfitPeriod.Daily => date,
        ProfitPeriod.Weekly => date.AddDays(-(int)date.DayOfWeek),
        ProfitPeriod.Monthly => new DateOnly(date.Year, date.Month, 1),
        ProfitPeriod.Yearly => new DateOnly(date.Year, 1, 1),
        _ => date
    };

    private static string FormatLabel(DateOnly periodStart, ProfitPeriod period) => period switch
    {
        ProfitPeriod.Daily => periodStart.ToString("dd MMM"),
        ProfitPeriod.Weekly => $"Week of {periodStart:dd MMM}",
        ProfitPeriod.Monthly => periodStart.ToString("MMM yyyy"),
        ProfitPeriod.Yearly => periodStart.Year.ToString(),
        _ => periodStart.ToString("d")
    };
}
