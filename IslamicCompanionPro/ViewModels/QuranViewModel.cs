using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Helpers;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class QuranViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly IQuranService _quranService;

	public ObservableCollection<QuranSurah> Surahs { get; } = new();
	public ObservableCollection<QuranAyah> SearchResults { get; } = new();

	[ObservableProperty]
	private string searchText = string.Empty;

	[ObservableProperty]
	private bool isSearchActive;

	[ObservableProperty]
	private Bookmark? lastRead;

	public QuranViewModel(IQuranService quranService)
	{
		_quranService = quranService;
		Title = "Quran";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		if (Surahs.Count > 0)
		{
			LastRead = await _quranService.GetLastReadAsync();
			return; // already loaded once; avoid re-querying every navigation
		}

		IsBusy = true;
		try
		{
			var surahs = await _quranService.GetSurahsAsync();
			Surahs.Clear();
			foreach (var surah in surahs)
			{
				Surahs.Add(surah);
			}

			LastRead = await _quranService.GetLastReadAsync();
		}
		finally
		{
			IsBusy = false;
		}
	}

	partial void OnSearchTextChanged(string value)
	{
		SearchCommand.Execute(null);
	}

	[RelayCommand]
	private async Task SearchAsync()
	{
		if (string.IsNullOrWhiteSpace(SearchText))
		{
			IsSearchActive = false;
			SearchResults.Clear();
			return;
		}

		IsSearchActive = true;
		var results = await _quranService.SearchAsync(SearchText);
		SearchResults.Clear();
		foreach (var ayah in results)
		{
			SearchResults.Add(ayah);
		}
	}

	[RelayCommand]
	private Task OpenSurahAsync(QuranSurah? surah)
	{
		if (surah is null)
		{
			return Task.CompletedTask;
		}

		return Shell.Current.GoToAsync($"{Routes.SurahDetail}?surahNumber={surah.SurahNumber}");
	}

	[RelayCommand]
	private Task OpenAyahAsync(QuranAyah? ayah)
	{
		if (ayah is null)
		{
			return Task.CompletedTask;
		}

		return Shell.Current.GoToAsync($"{Routes.SurahDetail}?surahNumber={ayah.SurahNumber}&ayahNumber={ayah.AyahNumber}");
	}

	[RelayCommand]
	private Task ContinueLastReadAsync()
	{
		if (LastRead is null)
		{
			return Task.CompletedTask;
		}

		// LastRead.ItemId stores the GlobalAyahNumber; SurahDetailPage resolves the surah for it.
		return Shell.Current.GoToAsync($"{Routes.SurahDetail}?globalAyahNumber={LastRead.ItemId}");
	}
}
