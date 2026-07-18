namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single line item within an <see cref="Invoice"/>.</summary>
public class InvoiceDetail
{
    public int InvoiceDetailId { get; set; }
    public int InvoiceId { get; set; }
    public int StockId { get; set; }
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }

    /// <summary>Database-computed persisted column (GrossWeight - StoneWeight). Do not set directly.</summary>
    public decimal NetWeight { get; private set; }

    public decimal Rate { get; set; }
    public decimal MakingCharge { get; set; }
    public decimal StoneValue { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal LineTotal { get; set; }

    public Invoice Invoice { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
