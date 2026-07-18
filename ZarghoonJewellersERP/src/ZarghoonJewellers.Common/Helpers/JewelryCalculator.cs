namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Pure, side-effect-free jewelry costing math shared by the Stock edit screens, the Quick
/// Stock Entry grid, Excel import validation and the Business layer - one place owns the
/// purity/making-charge/profit formulas so the fast-entry grid and the "official" saved
/// record can never silently disagree on how a number was derived.
/// </summary>
public static class JewelryCalculator
{
    /// <summary>Fraction of pure (24K) gold contained in one gram of the given purity.</summary>
    public static decimal GetPurityFactor(string purity) => purity switch
    {
        "24K" => 1.0000m,
        "22K" => 0.9166m,
        "21K" => 0.8750m,
        "18K" => 0.7500m,
        "14K" => 0.5850m,
        _ => 0.9166m
    };

    public static decimal CalculateNetWeight(decimal grossWeight, decimal stoneWeight)
        => Math.Max(0, grossWeight - stoneWeight);

    /// <summary>Fine (pure 24K-equivalent) gold weight, including manufacturing loss/wastage %.</summary>
    public static decimal CalculateFineGoldWeight(decimal netWeight, string purity, decimal lossPercentage)
        => netWeight * GetPurityFactor(purity) * (1 + lossPercentage / 100m);

    /// <summary>Making charge for the given weight/quantity, per the item's charging method.</summary>
    public static decimal CalculateMakingCharge(string makingChargeType, decimal makingChargeValue, decimal netWeight, int quantity, decimal itemValue)
        => makingChargeType switch
        {
            "Fixed" => makingChargeValue * quantity,
            "Percentage" => itemValue * (makingChargeValue / 100m),
            _ /* PerGram */ => makingChargeValue * netWeight * quantity
        };

    /// <summary>Total purchase/cost value for a stock line: metal value + making + labor + stone value.</summary>
    public static decimal CalculatePurchaseValue(decimal netWeight, decimal purchaseRate, int quantity,
        string makingChargeType, decimal makingChargeValue, decimal laborCharges, decimal stoneValue)
    {
        var metalValue = netWeight * purchaseRate * quantity;
        var making = CalculateMakingCharge(makingChargeType, makingChargeValue, netWeight, quantity, metalValue);
        return metalValue + making + (laborCharges * quantity) + stoneValue;
    }

    /// <summary>Expected selling value at the item's configured sale rate, for the profit preview.</summary>
    public static decimal CalculateSellingValue(decimal netWeight, decimal saleRate, int quantity,
        string makingChargeType, decimal makingChargeValue, decimal laborCharges, decimal stoneValue)
    {
        var metalValue = netWeight * saleRate * quantity;
        var making = CalculateMakingCharge(makingChargeType, makingChargeValue, netWeight, quantity, metalValue);
        return metalValue + making + (laborCharges * quantity) + stoneValue;
    }

    /// <summary>Projected profit = selling value at SaleRate minus the purchase/cost value.</summary>
    public static decimal CalculateProfit(decimal netWeight, decimal purchaseRate, decimal saleRate, int quantity,
        string makingChargeType, decimal makingChargeValue, decimal laborCharges, decimal stoneValue)
    {
        var cost = CalculatePurchaseValue(netWeight, purchaseRate, quantity, makingChargeType, makingChargeValue, laborCharges, stoneValue);
        var sale = CalculateSellingValue(netWeight, saleRate, quantity, makingChargeType, makingChargeValue, laborCharges, stoneValue);
        return sale - cost;
    }

    /// <summary>Profit as a percentage of cost - 0 when cost is 0 to avoid a divide-by-zero surprise.</summary>
    public static decimal CalculateProfitMargin(decimal cost, decimal profit)
        => cost == 0 ? 0 : Math.Round(profit / cost * 100m, 2);
}
