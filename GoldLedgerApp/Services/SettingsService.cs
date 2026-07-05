namespace GoldLedgerApp.Services;

public enum WeightUnit
{
	Gram,
	Tola
}

public class SettingsService
{
	private const string ShopNameKey = "settings_shop_name";
	private const string CurrencySymbolKey = "settings_currency_symbol";
	private const string WeightUnitKey = "settings_weight_unit";
	private const string DefaultPurityKey = "settings_default_purity";

	public const double GramsPerTola = 11.6638;

	public string ShopName
	{
		get => Preferences.Default.Get(ShopNameKey, "My Jewellery Shop");
		set => Preferences.Default.Set(ShopNameKey, value);
	}

	public string CurrencySymbol
	{
		get => Preferences.Default.Get(CurrencySymbolKey, "₹");
		set => Preferences.Default.Set(CurrencySymbolKey, value);
	}

	public WeightUnit WeightUnit
	{
		get => (WeightUnit)Preferences.Default.Get(WeightUnitKey, (int)WeightUnit.Gram);
		set => Preferences.Default.Set(WeightUnitKey, (int)value);
	}

	public double DefaultPurityKarat
	{
		get => Preferences.Default.Get(DefaultPurityKey, 24.0);
		set => Preferences.Default.Set(DefaultPurityKey, value);
	}

	public string FormatAmount(decimal amount) => $"{CurrencySymbol}{amount:N2}";

	public string FormatWeight(double grams)
	{
		return WeightUnit == WeightUnit.Tola
			? $"{grams / GramsPerTola:N3} tola"
			: $"{grams:N3} g";
	}
}
