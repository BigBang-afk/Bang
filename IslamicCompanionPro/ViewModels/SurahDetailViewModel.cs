using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;
using Microsoft.Maui.Controls;

namespace IslamicCompanionPro.ViewModels;

[QueryProperty(nameof(SurahNumberParam), "surahNumber")]
[QueryProperty(nameof(JuzNumberParam), "juzNumber")]
[QueryProperty(nameof(AyahNumberParam), "ayahNumber")]
[QueryProperty(nameof(GlobalAyahNumberParam), "globalAyahNumber")]
public partial class SurahDetailViewModel : BaseViewModel
{
	private readonly IQuranService _quranService;
	private readonly ISettingsService _settingsService;
	private readonly IAudioService _audioService;

	public ObservableCollection<AyahDisplayItem> Ayahs { get; } = new();

	[ObservableProperty]
	private double fontSize = 26;

	[ObservableProperty]
	private string arabicFontFamily = "Amiri";

	[ObservableProperty]
	private int scrollToAyahNumber;

	public string SurahNumberParam { set => _ = LoadBySurahAsync(int.Parse(value)); }
	public string JuzNumberParam { set => _ = LoadByJuzAsync(int.Parse(value)); }
	public string AyahNumberParam { set => ScrollToAyahNumber = int.TryParse(value, out int n) ? n : 0; }
	public string GlobalAyahNumberParam { set => _ = LoadByGlobalAyahAsync(int.Parse(value)); }

	public SurahDetailViewModel(IQuranService quranService, ISettingsService settingsService, IAudioService audioService)
	{
		_quranService = quranService;
		_settingsService = settingsService;
		_audioService = audioService;
	}

	private async Task LoadSettingsAsync()
	{
		var settings = await _settingsService.GetAppSettingsAsync();
		FontSize = settings.QuranFontSize;
		ArabicFontFamily = settings.ArabicFontFamily;
	}

	private async Task LoadBySurahAsync(int surahNumber)
	{
		IsBusy = true;
		try
		{
			await LoadSettingsAsync();
			var surah = await _quranService.GetSurahAsync(surahNumber);
			Title = surah?.NameTransliteration ?? "Surah";

			var ayahs = await _quranService.GetAyahsBySurahAsync(surahNumber);
			var translations = await _quranService.GetTranslationsForSurahAsync(surahNumber, "en");
			await PopulateAsync(ayahs, translations);

			if (ayahs.Count > 0)
			{
				await _quranService.SetLastReadAsync(ayahs[0].GlobalAyahNumber);
			}
		}
		finally
		{
			IsBusy = false;
		}
	}

	private async Task LoadByJuzAsync(int juzNumber)
	{
		IsBusy = true;
		try
		{
			await LoadSettingsAsync();
			Title = $"Juz {juzNumber}";

			var ayahs = await _quranService.GetAyahsByJuzAsync(juzNumber);
			var translations = new Dictionary<int, string>();
			foreach (var surahNumber in ayahs.Select(a => a.SurahNumber).Distinct())
			{
				var t = await _quranService.GetTranslationsForSurahAsync(surahNumber, "en");
				foreach (var kvp in t)
				{
					translations[kvp.Key] = kvp.Value;
				}
			}
			await PopulateAsync(ayahs, translations);
		}
		finally
		{
			IsBusy = false;
		}
	}

	private async Task LoadByGlobalAyahAsync(int globalAyahNumber)
	{
		// Used by "Continue Last Read": resolve which Surah this global Ayah number belongs to.
		var allSurahs = await _quranService.GetSurahsAsync();
		foreach (var surah in allSurahs)
		{
			var ayahs = await _quranService.GetAyahsBySurahAsync(surah.SurahNumber);
			var match = ayahs.FirstOrDefault(a => a.GlobalAyahNumber == globalAyahNumber);
			if (match is not null)
			{
				ScrollToAyahNumber = match.AyahNumber;
				await LoadBySurahAsync(surah.SurahNumber);
				return;
			}
		}
	}

	private async Task PopulateAsync(List<QuranAyah> ayahs, Dictionary<int, string> translations)
	{
		Ayahs.Clear();
		foreach (var ayah in ayahs)
		{
			bool isFavorite = await _quranService.IsFavoriteAsync(ayah.GlobalAyahNumber);
			Ayahs.Add(new AyahDisplayItem
			{
				GlobalAyahNumber = ayah.GlobalAyahNumber,
				SurahNumber = ayah.SurahNumber,
				AyahNumber = ayah.AyahNumber,
				TextArabic = ayah.TextArabic,
				Translation = translations.GetValueOrDefault(ayah.GlobalAyahNumber, string.Empty),
				IsFavorite = isFavorite
			});
		}

		// Re-raise this so the page's scroll-to-ayah listener (which only reacts to property
		// change notifications) fires again now that Ayahs actually has items in it — otherwise
		// a ScrollToAyahNumber set before PopulateAsync finished would be missed.
		if (ScrollToAyahNumber > 0)
		{
			OnPropertyChanged(nameof(ScrollToAyahNumber));
		}
	}

	[RelayCommand]
	private async Task ToggleFavoriteAsync(AyahDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		item.IsFavorite = await _quranService.ToggleFavoriteAsync(item.GlobalAyahNumber);
	}

	[RelayCommand]
	private Task BookmarkAsync(AyahDisplayItem? item) =>
		item is null ? Task.CompletedTask : _quranService.AddBookmarkAsync(item.GlobalAyahNumber);

	[RelayCommand]
	private async Task CopyAyahAsync(AyahDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		await Clipboard.Default.SetTextAsync($"{item.TextArabic}\n\n{item.Translation}\n({item.Reference})");
	}

	[RelayCommand]
	private async Task ShareAyahAsync(AyahDisplayItem? item)
	{
		if (item is null)
		{
			return;
		}

		await Share.Default.RequestAsync(new ShareTextRequest
		{
			Text = $"{item.TextArabic}\n\n{item.Translation}\n(Qur'an {item.Reference})",
			Title = "Share Ayah"
		});
	}

	[RelayCommand]
	private Task PlayAudioAsync(AyahDisplayItem? item) =>
		item is null ? Task.CompletedTask : _audioService.PlayAsync(item.GlobalAyahNumber, "mishary_alafasy");

	[RelayCommand]
	private Task DownloadAudioAsync(AyahDisplayItem? item) =>
		item is null ? Task.CompletedTask : _audioService.DownloadAsync(item.GlobalAyahNumber, "mishary_alafasy");

	[RelayCommand]
	private void IncreaseFontSize() => FontSize = Math.Min(FontSize + 2, 48);

	[RelayCommand]
	private void DecreaseFontSize() => FontSize = Math.Max(FontSize - 2, 16);
}
