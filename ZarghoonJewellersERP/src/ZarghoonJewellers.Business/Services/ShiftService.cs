using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class ShiftService : IShiftService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ShiftService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<Shift?> GetOpenShiftForCashierAsync(int cashierUserId, CancellationToken cancellationToken = default)
        => _unitOfWork.Shifts.GetOpenShiftForCashierAsync(cashierUserId, cancellationToken);

    public async Task<Shift> OpenShiftAsync(int cashierUserId, decimal openingCash, CancellationToken cancellationToken = default)
    {
        var existing = await _unitOfWork.Shifts.GetOpenShiftForCashierAsync(cashierUserId, cancellationToken);
        if (existing is not null)
            throw new BusinessRuleException("You already have an open shift. Close it before opening a new one.");

        var shift = new Shift
        {
            CashierUserId = cashierUserId,
            OpenedAt = DateTime.Now,
            OpeningCash = openingCash,
            Status = "Open",
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.Shifts.AddAsync(shift, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(cashierUserId, "Insert", "Shifts", shift.ShiftId.ToString(), null,
            $"Shift opened with {openingCash:C0} float", cancellationToken);

        return shift;
    }

    public async Task<ShiftCloseSummaryDto> CloseShiftAsync(int shiftId, decimal closingCashCounted, string? notes, CancellationToken cancellationToken = default)
    {
        var shift = await _unitOfWork.Shifts.GetByIdAsync(shiftId, cancellationToken)
            ?? throw new BusinessRuleException("Shift not found.");

        if (shift.Status != "Open")
            throw new BusinessRuleException("This shift is already closed.");

        var closedAt = DateTime.Now;
        var cashMovements = (await _unitOfWork.CashLedger.GetBetweenAsync(shift.OpenedAt, closedAt, cancellationToken))
            .Where(c => string.Equals(c.PaymentMode, "Cash", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var cashReceipts = cashMovements.Where(c => c.TransactionType == "Receipt").Sum(c => c.Amount);
        var cashPayments = cashMovements.Where(c => c.TransactionType == "Payment").Sum(c => c.Amount);
        var expectedCash = shift.OpeningCash + cashReceipts - cashPayments;

        shift.ClosedAt = closedAt;
        shift.ClosingCashCounted = closingCashCounted;
        shift.ExpectedCash = expectedCash;
        shift.CashDifference = closingCashCounted - expectedCash;
        shift.Status = "Closed";
        shift.Notes = notes;
        _unitOfWork.Shifts.Update(shift);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var invoices = await _unitOfWork.Invoices.GetByShiftAsync(shiftId, cancellationToken);
        var confirmedInvoices = invoices.Where(i => i.Status == "Confirmed").ToList();

        await _auditService.LogAsync(shift.CashierUserId, "Update", "Shifts", shiftId.ToString(), "Open",
            $"Closed - expected {expectedCash:C0}, counted {closingCashCounted:C0}, diff {shift.CashDifference:C0}", cancellationToken);

        return new ShiftCloseSummaryDto(
            shift.ShiftId, shift.OpenedAt, closedAt, shift.OpeningCash, cashReceipts, cashPayments,
            expectedCash, closingCashCounted, shift.CashDifference.Value,
            confirmedInvoices.Count, confirmedInvoices.Sum(i => i.TotalAmount));
    }

    public Task<IReadOnlyList<Shift>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => _unitOfWork.Shifts.GetRecentAsync(count, cancellationToken);
}
