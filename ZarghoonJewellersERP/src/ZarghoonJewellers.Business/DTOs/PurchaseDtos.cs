namespace ZarghoonJewellers.Business.DTOs;

/// <summary>One line on a purchase order. <see cref="StockId"/> is null when this introduces a brand-new
/// catalogue item, in which case <see cref="CategoryId"/>/<see cref="ItemName"/> are used to create it.</summary>
public class PurchaseLineRequest
{
    public int? StockId { get; set; }
    public int? CategoryId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal Rate { get; set; }
    public int Quantity { get; set; } = 1;

    public decimal NetWeight => GrossWeight - StoneWeight;
    public decimal Amount => NetWeight * Rate * Quantity;
}

public class CreatePurchaseRequest
{
    public int SupplierId { get; set; }
    public decimal GoldRateAtPurchase { get; set; }
    public decimal PaidAmount { get; set; }
    public int CreatedBy { get; set; }
    public List<PurchaseLineRequest> Lines { get; set; } = new();
}

public record PurchaseResultDto(int PurchaseId, string PurchaseNumber, decimal TotalAmount, decimal BalanceAmount);
