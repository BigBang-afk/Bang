using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Helpers;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class DuaCategoriesViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly IDuaService _duaService;

	public ObservableCollection<DuaCategory> Categories { get; } = new();
	public ObservableCollection<Dua> SearchResults { get; } = new();

	[ObservableProperty]
	private string searchText = string.Empty;

	[ObservableProperty]
	private bool isSearchActive;

	public DuaCategoriesViewModel(IDuaService duaService)
	{
		_duaService = duaService;
		Title = "Duas";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		if (Categories.Count > 0)
		{
			return;
		}

		IsBusy = true;
		try
		{
			var categories = await _duaService.GetCategoriesAsync();
			Categories.Clear();
			foreach (var category in categories)
			{
				Categories.Add(category);
			}
		}
		finally
		{
			IsBusy = false;
		}
	}

	partial void OnSearchTextChanged(string value) => SearchCommand.Execute(null);

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
		var results = await _duaService.SearchAsync(SearchText);
		SearchResults.Clear();
		foreach (var dua in results)
		{
			SearchResults.Add(dua);
		}
	}

	[RelayCommand]
	private Task OpenCategoryAsync(DuaCategory? category) =>
		category is null ? Task.CompletedTask : Shell.Current.GoToAsync($"{Routes.DuaDetail}?categoryId={category.Id}");

	[RelayCommand]
	private Task OpenDuaAsync(Dua? dua) =>
		dua is null ? Task.CompletedTask : Shell.Current.GoToAsync($"{Routes.DuaDetail}?categoryId={dua.CategoryId}&duaId={dua.Id}");
}
