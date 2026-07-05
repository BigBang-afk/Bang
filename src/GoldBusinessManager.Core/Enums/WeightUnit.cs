namespace GoldBusinessManager.Core.Enums;

/// <summary>
/// Unit the user typed the weight in. Every entity also stores the same weight
/// converted to grams (WeightInGrams) — grams is the only unit ever used for
/// stock, calculations, and reports.
/// </summary>
public enum WeightUnit
{
    Gram = 0,
    Tola = 1,
    Masha = 2,
    Ratti = 3
}
