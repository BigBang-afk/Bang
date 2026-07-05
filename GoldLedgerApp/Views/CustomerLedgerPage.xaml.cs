using GoldLedgerApp.ViewModels;

namespace GoldLedgerApp.Views;

public partial class CustomerLedgerPage : ContentPage
{
	private readonly CustomerLedgerViewModel _viewModel;

	public CustomerLedgerPage(CustomerLedgerViewModel viewModel)
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
