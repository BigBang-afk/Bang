namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Centralizes how a <c>CashLedgerEntry.RunningBalance</c> is derived so every poster (invoice
/// checkout, purchase payment, manual entries, returns) computes it identically. RunningBalance
/// represents physical Cash-in-Hand, so only entries where <c>PaymentMode == "Cash"</c> move it -
/// a payment made by Bank/Card/JazzCash/EasyPaisa/USDT/Cheque is still recorded (for the entity's
/// ledger and audit trail) but carries the previous cash balance forward unchanged, since it never
/// touched the till. Getting this wrong would silently inflate "Cash in Hand" on the dashboard and
/// corrupt Shift Closing's expected-cash figure.
/// </summary>
public static class LedgerCalculator
{
    public static decimal ComputeRunningCashBalance(decimal previousBalance, string transactionType, string paymentMode, decimal amount)
    {
        if (!string.Equals(paymentMode, "Cash", StringComparison.OrdinalIgnoreCase))
            return previousBalance;

        var signedAmount = transactionType == "Receipt" ? amount : -amount;
        return previousBalance + signedAmount;
    }
}
