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

/// <summary>One payment method's contribution to a checkout - a fully-paid Cash sale has exactly
/// one of these; a split payment (half Cash, half Card) has two or more.</summary>
public class PaymentLineRequest
{
    public string PaymentMethod { get; set; } = "Cash"; // Cash/Bank/Card/JazzCash/EasyPaisa/USDT
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; }
    public int? BankAccountId { get; set; }
}

/// <summary>Everything required to persist a new sales invoice in one atomic operation. Either set
/// <see cref="PaidAmount"/>/<see cref="PaymentMode"/> for a simple single-method payment (unchanged
/// from the original POS screen), or populate <see cref="SplitPayments"/> for a multi-method/split
/// payment checkout - when present it takes precedence and its sum becomes the paid amount.</summary>
public class CreateInvoiceRequest
{
    public int CustomerId { get; set; }
    public decimal GoldRateAtSale { get; set; }
    public decimal DiscountPercentage { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxPercentage { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentMode { get; set; } = "Cash";
    public decimal OldGoldExchangeWeight { get; set; }
    public int CreatedBy { get; set; }
    public int? ShiftId { get; set; }
    public List<InvoiceLineRequest> Lines { get; set; } = new();

    /// <summary>When non-empty, overrides PaidAmount/PaymentMode with a real split/multi-method payment.</summary>
    public List<PaymentLineRequest> SplitPayments { get; set; } = new();
}

public record InvoiceResultDto(int InvoiceId, string InvoiceNumber, decimal TotalAmount, decimal BalanceAmount);

/// <summary>One line the user is returning/exchanging from a previous invoice - references the
/// original InvoiceDetail so quantities and weights can't drift from what was actually sold.</summary>
public class ReturnLineRequest
{
    public int OriginalInvoiceDetailId { get; set; }
    public int StockId { get; set; }
    public int Quantity { get; set; }
    public decimal NetWeight { get; set; }
    public decimal Rate { get; set; }
    public decimal RefundAmount { get; set; }
}

/// <summary>A return (refund only) or an exchange (return + immediately buy replacement items) against
/// a previously confirmed sale. When <see cref="NewLines"/> is empty this is a pure return.</summary>
public class ProcessReturnRequest
{
    public int OriginalInvoiceId { get; set; }
    public List<ReturnLineRequest> ReturnLines { get; set; } = new();
    public List<InvoiceLineRequest> NewLines { get; set; } = new();
    public decimal GoldRateAtSale { get; set; }
    public int CreatedBy { get; set; }
}

public record ReturnResultDto(int ReturnInvoiceId, string ReturnInvoiceNumber, decimal RefundAmount, int? ExchangeInvoiceId, string? ExchangeInvoiceNumber, decimal AdditionalAmountDue);
