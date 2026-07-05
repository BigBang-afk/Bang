using GoldLedgerApp.ViewModels;

namespace GoldLedgerApp.Views;

public partial class BuyGoldPage : ContentPage
{
	private readonly BuyGoldViewModel _viewModel;

	public BuyGoldPage(BuyGoldViewModel viewModel)
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
