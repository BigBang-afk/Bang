using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class TradingPair : BaseEntity
{
    public string Symbol { get; set; } = string.Empty; // e.g. EURUSD, EURUSD_OTC
    public string DisplayName { get; set; } = string.Empty; // e.g. EUR/USD OTC
    public PairMarketType MarketType { get; set; } = PairMarketType.Regular;
    public string BaseCurrency { get; set; } = string.Empty;
    public string QuoteCurrency { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public decimal CurrentPayoutPercent { get; set; }
    public string ProviderSymbolMapping { get; set; } = string.Empty; // symbol as known to the configured provider
    public int PricePrecision { get; set; } = 5;
    public bool RequiresPremium { get; set; }
    public int SortOrder { get; set; }

    public ICollection<TradingSession> TradingSessions { get; set; } = new List<TradingSession>();
}
