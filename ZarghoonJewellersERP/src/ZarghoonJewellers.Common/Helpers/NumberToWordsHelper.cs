using System.Text;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>Converts an amount to words for printed invoices/receipts (e.g. "Rupees Twenty Five Thousand Only"),
/// using the South-Asian lakh/crore grouping that matches how PKR amounts are conventionally read.</summary>
public static class NumberToWordsHelper
{
    private static readonly string[] Ones =
    {
        "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
        "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"
    };

    private static readonly string[] Tens =
    {
        "", "", "Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"
    };

    public static string ConvertAmountToWords(decimal amount, string currencyName = "Rupees")
    {
        long rupees = (long)Math.Floor(amount);
        int paisa = (int)Math.Round((amount - rupees) * 100);

        var sb = new StringBuilder();
        sb.Append(currencyName).Append(' ');
        sb.Append(rupees == 0 ? "Zero" : ConvertIndianGrouped(rupees));

        if (paisa > 0)
        {
            sb.Append(" and ").Append(ConvertBelowThousand(paisa)).Append(" Paisa");
        }

        sb.Append(" Only");
        return sb.ToString();
    }

    /// <summary>Groups using the South Asian scale: Crore (10^7), Lakh (10^5), Thousand (10^3).</summary>
    private static string ConvertIndianGrouped(long number)
    {
        if (number < 0) return "Minus " + ConvertIndianGrouped(-number);

        var parts = new List<string>();

        long crore = number / 10_000_000; number %= 10_000_000;
        long lakh = number / 100_000; number %= 100_000;
        long thousand = number / 1_000; number %= 1_000;
        long remainder = number;

        if (crore > 0) parts.Add(ConvertBelowThousand((int)crore) + " Crore");
        if (lakh > 0) parts.Add(ConvertBelowThousand((int)lakh) + " Lakh");
        if (thousand > 0) parts.Add(ConvertBelowThousand((int)thousand) + " Thousand");
        if (remainder > 0) parts.Add(ConvertBelowThousand((int)remainder));

        return string.Join(" ", parts);
    }

    private static string ConvertBelowThousand(int number)
    {
        if (number == 0) return string.Empty;
        if (number < 20) return Ones[number];

        if (number < 100)
        {
            int tens = number / 10, ones = number % 10;
            return ones == 0 ? Tens[tens] : $"{Tens[tens]} {Ones[ones]}";
        }

        int hundreds = number / 100, rest = number % 100;
        return rest == 0
            ? $"{Ones[hundreds]} Hundred"
            : $"{Ones[hundreds]} Hundred {ConvertBelowThousand(rest)}";
    }
}
