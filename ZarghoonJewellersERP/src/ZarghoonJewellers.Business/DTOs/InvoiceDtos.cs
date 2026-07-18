namespace ZarghoonJewellers.Business.DTOs;

/// <summary>One line the user has added to the invoice being built in the POS screen, before it is persisted.</summary>
public class InvoiceLineRequest
{
    public int StockId { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public decimal Rate { get; set; }
    public decimal MakingCharge { get; set; }
    public decimal StoneValue { get; set; }
    public int Quantity { get; set; } = 1;
    public string Purity { get; set; } = string.Empty;

    public decimal NetWeight => GrossWeight - StoneWeight;
    public decimal LineTotal => (NetWeight * Rate) + MakingCharge + StoneValue;
}

/// <summary>Everything required to persist a new sales invoice in one atomic operation.</summary>
public class CreateInvoiceRequest
{
    public int CustomerId { get; set; }
    public decimal GoldRateAtSale { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentMode { get; set; } = "Cash";
    public decimal OldGoldExchangeWeight { get; set; }
    public int CreatedBy { get; set; }
    public List<InvoiceLineRequest> Lines { get; set; } = new();
}

public record InvoiceResultDto(int InvoiceId, string InvoiceNumber, decimal TotalAmount, decimal BalanceAmount);
