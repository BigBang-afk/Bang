using CommunityToolkit.Mvvm.ComponentModel;

namespace IslamicCompanionPro.ViewModels;

/// <summary>UI-only wrapper combining a QuranAyah with its translation and per-user state (favorite/bookmark) for binding.</summary>
public partial class AyahDisplayItem : ObservableObject
{
	public int GlobalAyahNumber { get; init; }
	public int SurahNumber { get; init; }
	public int AyahNumber { get; init; }
	public string TextArabic { get; init; } = string.Empty;
	public string Translation { get; init; } = string.Empty;

	[ObservableProperty]
	private bool isFavorite;

	public string Reference => $"{SurahNumber}:{AyahNumber}";
}
