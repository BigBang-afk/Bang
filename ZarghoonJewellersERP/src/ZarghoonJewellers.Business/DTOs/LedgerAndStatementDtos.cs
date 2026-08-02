using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.DTOs;

/// <summary>Combined cash + gold movement history for one Customer/Supplier/Karigar - the
/// "Ledger" screens (Customer Ledger, Supplier Ledger, Karigar Ledger) show both side by side
/// since a jewelry shop settles balances in either currency or gold weight.</summary>
public class EntityLedgerDto
{
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public decimal CurrentCashBalance { get; set; }
    public decimal CurrentGoldBalance { get; set; }
    public IReadOnlyList<CashLedgerEntry> CashMovements { get; set; } = Array.Empty<CashLedgerEntry>();
    public IReadOnlyList<GoldLedgerEntry> GoldMovements { get; set; } = Array.Empty<GoldLedgerEntry>();
}

/// <summary>One row on the Customer Statement / Outstanding Report - a customer's running position.</summary>
public record CustomerStatementDto(int CustomerId, string CustomerCode, string FullName, string? Phone,
    decimal OpeningBalance, decimal CurrentBalance, decimal CurrentGoldBalance, DateTime? LastInvoiceDate);
