using System.Globalization;

namespace GoldLedgerApp.Converters;

public class PinDotFillConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		var pin = value as string ?? string.Empty;
		var index = parameter is string s ? int.Parse(s) : 0;

		var filled = pin.Length >= index;
		return filled ? Application.Current!.Resources["Gold"] : Colors.Transparent;
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}
