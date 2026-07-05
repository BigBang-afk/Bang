using System.Globalization;

namespace IslamicCompanionPro.Helpers;

public class InverseBoolConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) => value is bool b && !b;
	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => value is bool b && !b;
}

/// <summary>True when the value is a non-null, non-empty string, or any other non-null reference.</summary>
public class IsNotNullConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
		value switch
		{
			null => false,
			string s => !string.IsNullOrWhiteSpace(s),
			_ => true
		};

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}

public class InverseBoolToColorConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
		value is bool b && b ? Colors.Transparent : Colors.Red;

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}

/// <summary>Renders a bool favorite/bookmark flag as a filled or outline heart/bookmark glyph.</summary>
public class BoolToGlyphConverter : IValueConverter
{
	public string TrueGlyph { get; set; } = "★";
	public string FalseGlyph { get; set; } = "☆";

	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
		value is true ? TrueGlyph : FalseGlyph;

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) => throw new NotSupportedException();
}
