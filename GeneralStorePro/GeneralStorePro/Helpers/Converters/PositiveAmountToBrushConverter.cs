using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace GeneralStorePro.Helpers.Converters;

/// <summary>
/// Renders a decimal amount in the danger color when positive (an outstanding balance), normal text color otherwise.
/// </summary>
public sealed class PositiveAmountToBrushConverter : IValueConverter
{
    private static readonly SolidColorBrush DangerBrush = new(Color.FromRgb(0xDC, 0x26, 0x26));
    private static readonly SolidColorBrush NormalBrush = new(Color.FromRgb(0x11, 0x18, 0x27));

    public object Convert(object? value, Type targetType, object parameter, CultureInfo culture)
    {
        var amount = value is decimal d ? d : 0m;
        return amount > 0 ? DangerBrush : NormalBrush;
    }

    public object ConvertBack(object? value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}
