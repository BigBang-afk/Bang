using GoldLedgerApp.Views;

namespace GoldLedgerApp;

public partial class AppShell : Shell
{
	public AppShell()
	{
		InitializeComponent();
		Routing.RegisterRoute(nameof(CustomerDetailPage), typeof(CustomerDetailPage));
	}
}
