namespace TradingJournal.Core.Services;

/// <summary>
/// Pure conversion math: USD profit/loss -> PKR -> gold-equivalent.
/// PKR = USD * usdToPkrRate. Gold = PKR / goldRatePerUnit.
/// </summary>
public static class CalculationService
{
    public static decimal UsdToPkr(decimal amountUsd, decimal usdToPkrRate)
    {
        if (usdToPkrRate <= 0)
            throw new ArgumentOutOfRangeException(nameof(usdToPkrRate), "USD to PKR rate must be greater than zero.");

        return amountUsd * usdToPkrRate;
    }

    public static decimal PkrToGold(decimal amountPkr, decimal goldRatePerUnit)
    {
        if (goldRatePerUnit <= 0)
            throw new ArgumentOutOfRangeException(nameof(goldRatePerUnit), "Gold rate must be greater than zero.");

        return amountPkr / goldRatePerUnit;
    }

    public static (decimal Pkr, decimal Gold) ConvertUsd(decimal amountUsd, decimal usdToPkrRate, decimal goldRatePerUnit)
    {
        var pkr = UsdToPkr(amountUsd, usdToPkrRate);
        var gold = PkrToGold(pkr, goldRatePerUnit);
        return (pkr, gold);
    }
}
