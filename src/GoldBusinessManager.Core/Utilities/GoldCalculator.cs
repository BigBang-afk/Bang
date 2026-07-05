namespace GoldBusinessManager.Core.Utilities;

/// <summary>
/// The only two formulas used anywhere in this app. Every screen that shows a
/// sale or purchase total must go through these methods instead of re-deriving
/// the math, so the calculation is guaranteed to be identical everywhere.
/// </summary>
public static class GoldCalculator
{
    public static double GoldAmount(double weightInGrams, double goldRatePerGram)
        => weightInGrams * goldRatePerGram;

    public static double SalesFinalTotal(double weightInGrams, double goldRatePerGram, double makingCharges, double discount)
        => GoldAmount(weightInGrams, goldRatePerGram) + makingCharges - discount;

    public static double SalesBalance(double finalTotal, double receivedAmount)
        => finalTotal - receivedAmount;

    public static double PurchaseAmount(double weightInGrams, double goldRatePerGram)
        => GoldAmount(weightInGrams, goldRatePerGram);

    public static double PurchaseBalance(double purchaseAmount, double paidAmount)
        => purchaseAmount - paidAmount;
}
