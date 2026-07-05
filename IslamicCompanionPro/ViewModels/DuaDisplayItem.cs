using CommunityToolkit.Mvvm.ComponentModel;

namespace IslamicCompanionPro.ViewModels;

public partial class DuaDisplayItem : ObservableObject
{
	public int Id { get; init; }
	public string Title { get; init; } = string.Empty;
	public string TextArabic { get; init; } = string.Empty;
	public string Transliteration { get; init; } = string.Empty;
	public string TranslationEnglish { get; init; } = string.Empty;
	public string TranslationUrdu { get; init; } = string.Empty;
	public string Reference { get; init; } = string.Empty;

	[ObservableProperty]
	private bool isFavorite;
}
