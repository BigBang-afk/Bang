namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single gold-weight movement (given/received) against a Customer, Supplier or Karigar,
/// identified polymorphically via <see cref="EntityType"/>/<see cref="EntityId"/>.</summary>
public class GoldLedgerEntry
{
    public int GoldLedgerId { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.Now;
    public string EntityType { get; set; } = string.Empty; // Customer / Supplier / Karigar
    public int EntityId { get; set; }
    public string TransactionType { get; set; } = string.Empty; // Given / Received
    public string Purity { get; set; } = "24K";
    public decimal Weight { get; set; }
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public string? Description { get; set; }
    public decimal RunningBalance { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public User CreatedByUser { get; set; } = null!;
}
