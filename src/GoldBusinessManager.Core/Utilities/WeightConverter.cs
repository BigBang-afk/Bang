using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Utilities;

/// <summary>
/// Converts between the traditional gold-trade weight units and grams.
/// Grams is the only unit ever stored in the database — conversion always
/// happens once, right when a weight is entered on a form.
/// </summary>
public static class WeightConverter
{
    /// <summary>Standard South Asian jewelry trade conversion: 1 Tola = 11.6638 grams.</summary>
    public const double GramsPerTola = 11.6638;

    /// <summary>1 Tola = 12 Masha.</summary>
    public const double GramsPerMasha = GramsPerTola / 12.0;

    /// <summary>1 Tola = 96 Ratti (8 Ratti per Masha).</summary>
    public const double GramsPerRatti = GramsPerTola / 96.0;

    public static double ToGrams(double value, WeightUnit unit) => unit switch
    {
        WeightUnit.Gram => value,
        WeightUnit.Tola => value * GramsPerTola,
        WeightUnit.Masha => value * GramsPerMasha,
        WeightUnit.Ratti => value * GramsPerRatti,
        _ => throw new ArgumentOutOfRangeException(nameof(unit), unit, "Unknown weight unit.")
    };

    public static double FromGrams(double grams, WeightUnit unit) => unit switch
    {
        WeightUnit.Gram => grams,
        WeightUnit.Tola => grams / GramsPerTola,
        WeightUnit.Masha => grams / GramsPerMasha,
        WeightUnit.Ratti => grams / GramsPerRatti,
        _ => throw new ArgumentOutOfRangeException(nameof(unit), unit, "Unknown weight unit.")
    };

    public static string UnitLabel(WeightUnit unit) => unit switch
    {
        WeightUnit.Gram => "g",
        WeightUnit.Tola => "tola",
        WeightUnit.Masha => "masha",
        WeightUnit.Ratti => "ratti",
        _ => unit.ToString()
    };
}
