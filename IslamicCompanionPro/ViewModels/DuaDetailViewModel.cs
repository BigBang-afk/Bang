using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

[QueryProperty(nameof(CategoryIdParam), "categoryId")]
public partial class DuaDetailViewModel : BaseViewModel
{
	private readonly IDuaService _duaService;
	private readonly ISettingsService _settingsService;

	public ObservableCollection<DuaDisplayItem> Duas { get; } = new();

	[ObservableProperty]
	private double fontSize = 20;

	public string CategoryIdParam { set => _ = LoadAsync(int.Parse(value)); }

	public DuaDetailViewModel(IDuaService duaService, ISettingsService settingsService)
	{
		_duaService = duaService;
		_settingsService = settingsService;
	}

	private async Task LoadAsync(int categoryId)
	{
		IsBusy = true;
		try
		{
			var appSettings = await _settingsService.GetAppSettingsAsync();
			FontSize = appSettings.DuaFontSize;

			var categories = await _duaService.GetCategoriesAsync();
			Title = categories.FirstOrDefault(c => c.Id == categoryId)?.NameEnglish ?? "Duas";

			var duas = await _duaService.GetDuasByCategoryAsync(categoryId);
			Duas.Clear();
			foreach (var dua in duas)
			{
				bool isFavorite = await _duaService.IsFavoriteAsync(dua.Id);
				Duas.Add(new DuaDisplayItem
				{
					Id = dua.Id,
					Title = dua.Title,
					TextArabic = dua.TextArabic,
					Transliteration = dua.Transliteration,
					TranslationEnglish = dua.TranslationEnglish,
					TranslationUrdu = dua.TranslationUrdu,
					Reference = dua.Reference,
					IsFavorite = isFavorite
				});
			}
		}
		finally
		{
			IsBusy = false;
		}
	}

	[RelayCommand]
	private async Task ToggleFavoriteAsync(DuaDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		item.IsFavorite = await _duaService.ToggleFavoriteAsync(item.Id);
	}

	[RelayCommand]
	private async Task CopyDuaAsync(DuaDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		await Clipboard.Default.SetTextAsync(BuildShareText(item));
	}

	[RelayCommand]
	private async Task ShareDuaAsync(DuaDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		await Share.Default.RequestAsync(new ShareTextRequest { Text = BuildShareText(item), Title = item.Title });
	}

	private static string BuildShareText(DuaDisplayItem item) =>
		$"{item.Title}\n\n{item.TextArabic}\n\n{item.Transliteration}\n\n{item.TranslationEnglish}\n\n({item.Reference})";
}
