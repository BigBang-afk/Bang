namespace ZarghoonJewellers.Business.DTOs;

/// <summary>Everything the Shift/Daily Closing screen shows when a cashier closes their till -
/// how much cash the system expects to be in the drawer vs. what was actually counted.</summary>
public record ShiftCloseSummaryDto(
    int ShiftId,
    DateTime OpenedAt,
    DateTime ClosedAt,
    decimal OpeningCash,
    decimal CashReceipts,
    decimal CashPayments,
    decimal ExpectedCash,
    decimal ClosingCashCounted,
    decimal CashDifference,
    int InvoiceCount,
    decimal TotalSales);
