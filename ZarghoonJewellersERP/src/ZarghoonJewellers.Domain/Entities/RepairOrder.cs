namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A customer repair/alteration job tracked from intake through delivery.</summary>
public class RepairOrder
{
    public int RepairOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public string MetalType { get; set; } = "Gold";
    public string? Purity { get; set; }
    public decimal Weight { get; set; }
    public int? KarigarId { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.Now;
    public DateOnly? PromisedDate { get; set; }
    public DateTime? DeliveredDate { get; set; }
    public decimal RepairCharges { get; set; }
    public decimal AdvancePaid { get; set; }
    public string Status { get; set; } = "Pending"; // Pending / InProgress / Completed / Delivered / Cancelled
    public string? Notes { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public Customer Customer { get; set; } = null!;
    public Karigar? Karigar { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
