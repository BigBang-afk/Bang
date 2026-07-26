using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.App.Converters;

/// <summary>
/// Maps a SignalType to the theme's semantic brush: green for CALL (bullish),
/// red for PUT (bearish), neutral gray for NO TRADE.
/// </summary>
public sealed class SignalTypeToBrushConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var key = value switch
        {
            SignalType.Call => "BullishBrush",
            SignalType.Put => "BearishBrush",
            _ => "NeutralBrush"
        };

        return Application.Current.TryFindResource(key) as Brush ?? Brushes.Gray;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
