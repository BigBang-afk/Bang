namespace ZarghoonJewellers.Domain.Entities;

/// <summary>An artisan/goldsmith who manufactures or repairs jewellery. Gold issued to a
/// karigar for work-in-progress is tracked via <see cref="CurrentGoldBalance"/> and the
/// <see cref="GoldLedger"/>.</summary>
public class Karigar
{
    public int KarigarId { get; set; }
    public string KarigarCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? CNIC { get; set; }
    public string? SpecialtyType { get; set; }
    public DateOnly? JoiningDate { get; set; }
    public decimal OpeningGoldBalance { get; set; }

    /// <summary>Grams of gold (24K-equivalent). Follows the same sign convention as
    /// <see cref="Customer.CurrentGoldBalance"/>: positive = the shop owes the karigar gold,
    /// negative = the karigar currently holds shop gold issued for work-in-progress (i.e. owes it back).
    /// The "Karigar Gold" dashboard card reports the gold-out-for-work amount as -CurrentGoldBalance
    /// when this value is negative.</summary>
    public decimal CurrentGoldBalance { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public ICollection<Stock> StockItems { get; set; } = new List<Stock>();
    public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
}
