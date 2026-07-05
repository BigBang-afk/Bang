using System.Globalization;
using GoldLedgerApp.Models;

namespace GoldLedgerApp.Converters;

public class TransactionTypeColorConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not TransactionType type) return Colors.Gray;
		return type == TransactionType.Buy
			? Application.Current!.Resources["Success"]
			: Application.Current!.Resources["Danger"];
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class TransactionTypeLabelConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not TransactionType type) return string.Empty;
		return type == TransactionType.Buy ? "BUY" : "SELL";
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class LedgerEntryTypeColorConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not LedgerEntryType type) return Colors.Gray;
		return type == LedgerEntryType.Debit
			? Application.Current!.Resources["Danger"]
			: Application.Current!.Resources["Success"];
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class LedgerEntryTypeLabelConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not LedgerEntryType type) return string.Empty;
		return type == LedgerEntryType.Debit ? "DEBIT" : "CREDIT";
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class TransactionTypeButtonStyleConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not TransactionType type) return Application.Current!.Resources["ChipButtonBuy"];
		return type == TransactionType.Buy
			? Application.Current!.Resources["ChipButtonBuy"]
			: Application.Current!.Resources["ChipButtonSell"];
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class TransactionTypeActionLabelConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		if (value is not TransactionType type) return string.Empty;
		return type == TransactionType.Buy ? "Record Purchase" : "Record Sale";
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class BalanceColorConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		var balance = value is decimal d ? d : 0m;
		if (balance > 0) return Application.Current!.Resources["Danger"];
		if (balance < 0) return Application.Current!.Resources["Success"];
		return Application.Current!.Resources["TextMuted"];
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class BalanceCaptionConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
	{
		var balance = value is decimal d ? d : 0m;
		if (balance > 0) return "owes shop";
		if (balance < 0) return "shop owes";
		return "Settled";
	}

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}

public class InvertedBoolConverter : IValueConverter
{
	public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> value is bool b && !b;

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> value is bool b && !b;
}

public class BoolToObjectConverter : IValueConverter
{
	public object? TrueValue { get; set; }
	public object? FalseValue { get; set; }

	public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> value is bool b && b ? TrueValue : FalseValue;

	public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
		=> throw new NotSupportedException();
}
