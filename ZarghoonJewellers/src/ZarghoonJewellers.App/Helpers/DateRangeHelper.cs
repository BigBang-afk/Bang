using System;

namespace ZarghoonJewellers.App.Helpers
{
    /// <summary>Common date-range presets used by the Dashboard, Karigar Ledger and Reports screens.</summary>
    public static class DateRangeHelper
    {
        public static (DateTime From, DateTime To) Today()
        {
            var today = DateTime.Today;
            return (today, today);
        }

        public static (DateTime From, DateTime To) ThisMonth()
        {
            var today = DateTime.Today;
            var from = new DateTime(today.Year, today.Month, 1);
            var to = from.AddMonths(1).AddDays(-1);
            return (from, to);
        }

        /// <summary>Converts an inclusive date (no time part) into the end-of-day boundary used for
        /// "Date &lt;= To" comparisons against text-stored dates.</summary>
        public static string ToDateKey(DateTime date) => date.ToString("yyyy-MM-dd");
    }
}
