using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ZarghoonJewellers.App.Helpers;

namespace ZarghoonJewellers.App.Views
{
    /// <summary>Reusable Today / This Month / All Time / Custom date-range picker used by the
    /// Dashboard, Karigar Ledger and Reports screens.</summary>
    public partial class DateFilterBar : UserControl
    {
        public DateTime? From { get; private set; }
        public DateTime? To { get; private set; }

        /// <summary>Raised whenever the selected range changes. Null/Null means "All Time".</summary>
        public event Action<DateTime?, DateTime?> FilterChanged;

        public DateFilterBar()
        {
            InitializeComponent();
        }

        private void BtnToday_Click(object sender, RoutedEventArgs e)
        {
            var (from, to) = DateRangeHelper.Today();
            Apply(from, to, BtnToday);
        }

        private void BtnThisMonth_Click(object sender, RoutedEventArgs e)
        {
            var (from, to) = DateRangeHelper.ThisMonth();
            Apply(from, to, BtnThisMonth);
        }

        private void BtnAllTime_Click(object sender, RoutedEventArgs e)
        {
            Apply(null, null, BtnAllTime);
        }

        private void BtnApply_Click(object sender, RoutedEventArgs e)
        {
            DateTime? from = DpFrom.SelectedDate;
            DateTime? to = DpTo.SelectedDate;
            Apply(from, to, BtnApply);
        }

        private void Apply(DateTime? from, DateTime? to, Button activeQuickButton)
        {
            From = from;
            To = to;

            DpFrom.SelectedDate = from;
            DpTo.SelectedDate = to;

            HighlightActive(activeQuickButton);
            FilterChanged?.Invoke(From, To);
        }

        private void HighlightActive(Button active)
        {
            foreach (var button in new[] { BtnToday, BtnThisMonth, BtnAllTime })
            {
                bool isActive = button == active;
                button.Style = (Style)FindResource(isActive ? "PrimaryButton" : "SecondaryButton");
            }
        }
    }
}
