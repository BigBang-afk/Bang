using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.App.Converters;

/// <summary>
/// Maps a ConnectionStatus to the theme's semantic brush: green when
/// healthy, yellow while connecting/delayed/reconnecting, red when
/// faulted, neutral gray when disconnected.
/// </summary>
public sealed class ConnectionStatusToBrushConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var key = value switch
        {
            ConnectionStatus.Connected => "BullishBrush",
            ConnectionStatus.Connecting or ConnectionStatus.Delayed or ConnectionStatus.Reconnecting => "WarningBrush",
            ConnectionStatus.Faulted => "BearishBrush",
            _ => "NeutralBrush"
        };

        return Application.Current.TryFindResource(key) as Brush ?? Brushes.Gray;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
