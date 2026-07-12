using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace TradingPortfolioDashboard.Converters;

/// <summary>Colors a P&amp;L number green when positive, red when negative, gray at zero.</summary>
public class PnLColorConverter : IValueConverter
{
    private static readonly SolidColorBrush Positive = new(Color.FromRgb(0x36, 0xB3, 0x7E));
    private static readonly SolidColorBrush Negative = new(Color.FromRgb(0xFF, 0x56, 0x30));
    private static readonly SolidColorBrush Neutral = new(Color.FromRgb(0xC1, 0xC7, 0xD0));

    static PnLColorConverter()
    {
        Positive.Freeze();
        Negative.Freeze();
        Neutral.Freeze();
    }

    public object Convert(object? value, Type targetType, object parameter, CultureInfo culture)
    {
        var number = value switch
        {
            decimal d => d,
            double d => (decimal)d,
            int i => i,
            _ => 0m
        };

        if (number > 0) return Positive;
        if (number < 0) return Negative;
        return Neutral;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
