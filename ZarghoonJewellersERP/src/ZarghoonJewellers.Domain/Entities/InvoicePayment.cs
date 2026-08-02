namespace ZarghoonJewellers.Domain.Entities;

/// <summary>One payment method's contribution toward settling an <see cref="Invoice"/> - an
/// invoice paid partly by Cash and partly by Card has two of these rows (split payment).</summary>
public class InvoicePayment
{
    public int InvoicePaymentId { get; set; }
    public int InvoiceId { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // Cash/Bank/Card/JazzCash/EasyPaisa/USDT
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; }
    public int? BankAccountId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public Invoice Invoice { get; set; } = null!;
    public BankAccount? BankAccount { get; set; }
}
