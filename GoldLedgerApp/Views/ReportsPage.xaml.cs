using GoldLedgerApp.ViewModels;

namespace GoldLedgerApp.Views;

public partial class ReportsPage : ContentPage
{
	private readonly ReportsViewModel _viewModel;

	public ReportsPage(ReportsViewModel viewModel)
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
