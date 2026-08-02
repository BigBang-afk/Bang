using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>Manages cashier till sessions for Shift/Daily Closing: opening a shift with a starting
/// cash float, and closing it with a counted-cash reconciliation against what the system expects.</summary>
public interface IShiftService
{
    Task<Shift?> GetOpenShiftForCashierAsync(int cashierUserId, CancellationToken cancellationToken = default);
    Task<Shift> OpenShiftAsync(int cashierUserId, decimal openingCash, CancellationToken cancellationToken = default);

    /// <summary>Closes the shift and returns the reconciliation summary. Expected cash is the opening
    /// float plus every Cash-mode CashLedger receipt/payment posted while the shift was open.</summary>
    Task<ShiftCloseSummaryDto> CloseShiftAsync(int shiftId, decimal closingCashCounted, string? notes, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Shift>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
