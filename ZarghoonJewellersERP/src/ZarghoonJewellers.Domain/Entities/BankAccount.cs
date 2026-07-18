namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A shop bank account used as a payment/receipt source across ledgers.</summary>
public class BankAccount
{
    public int BankAccountId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? IBAN { get; set; }
    public string? Branch { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;
}
