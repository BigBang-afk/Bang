namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A cashier's till session, used for shift/daily closing. <see cref="ExpectedCash"/> and
/// <see cref="CashDifference"/> are computed at close time from the CashLedger movements posted
/// while the shift was open, not tracked incrementally.</summary>
public class Shift
{
    public int ShiftId { get; set; }
    public int CashierUserId { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.Now;
    public DateTime? ClosedAt { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal? ClosingCashCounted { get; set; }
    public decimal? ExpectedCash { get; set; }

    /// <summary>ClosingCashCounted - ExpectedCash. Positive = till has more cash than expected, negative = short.</summary>
    public decimal? CashDifference { get; set; }

    public string Status { get; set; } = "Open"; // Open / Closed
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public User CashierUser { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
