namespace ZarghoonJewellers.Business.DTOs;

/// <summary>Aggregation period for the profit reports (Daily/Weekly/Monthly/Yearly buckets).</summary>
public enum ProfitPeriod
{
    Daily,
    Weekly,
    Monthly,
    Yearly
}

public record ProfitByItemDto(int StockId, string ItemCode, string ItemName, int QuantitySold, decimal Revenue, decimal Cost, decimal Profit);

public record ProfitByCategoryDto(int CategoryId, string CategoryName, int QuantitySold, decimal Revenue, decimal Cost, decimal Profit);

public record ProfitByEmployeeDto(int UserId, string EmployeeName, int InvoiceCount, decimal Revenue, decimal Cost, decimal Profit);

/// <summary>One bucket (day/week/month/year, depending on the requested <see cref="ProfitPeriod"/>) in
/// the profit-over-time report.</summary>
public record ProfitPeriodPointDto(string PeriodLabel, DateOnly PeriodStart, decimal Revenue, decimal Cost, decimal Profit);
