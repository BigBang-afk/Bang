using System.ComponentModel;
using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class SurahDetailPage : AppearingContentPage
{
	private readonly SurahDetailViewModel _viewModel;

	public SurahDetailPage(SurahDetailViewModel viewModel)
	{
		InitializeComponent();
		_viewModel = viewModel;
		BindingContext = viewModel;
		viewModel.PropertyChanged += OnViewModelPropertyChanged;
	}

	private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
	{
		if (e.PropertyName != nameof(SurahDetailViewModel.ScrollToAyahNumber) || _viewModel.ScrollToAyahNumber <= 0)
		{
			return;
		}

		var target = _viewModel.Ayahs.FirstOrDefault(a => a.AyahNumber == _viewModel.ScrollToAyahNumber);
		if (target is not null)
		{
			MainThread.BeginInvokeOnMainThread(() => AyahsCollectionView.ScrollTo(target, position: ScrollToPosition.Start, animate: true));
		}
	}

	protected override void OnDisappearing()
	{
		base.OnDisappearing();
		_viewModel.PropertyChanged -= OnViewModelPropertyChanged;
	}
}
