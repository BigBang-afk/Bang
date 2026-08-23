using System.Globalization;

namespace ZarghoonJewellers.App.Helpers
{
    /// <summary>Shared number/text formatting used across views and printed reports.</summary>
    public static class Formatting
    {
        public static string Cash(decimal amount) =>
            amount.ToString("N2", CultureInfo.InvariantCulture);

        public static string Gold(decimal grams) =>
            grams.ToString("N3", CultureInfo.InvariantCulture) + " g";

        public static string GoldPlain(decimal grams) =>
            grams.ToString("N3", CultureInfo.InvariantCulture);
    }
}
