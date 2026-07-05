using GoldLedgerApp.ViewModels;

namespace GoldLedgerApp.Views;

public partial class SellGoldPage : ContentPage
{
	private readonly SellGoldViewModel _viewModel;

	public SellGoldPage(SellGoldViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = _viewModel = viewModel;
	}

	protected override async void OnAppearing()
	{
		base.OnAppearing();
		await _viewModel.LoadCommand.ExecuteAsync(null);
	}
}
