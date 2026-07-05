using GoldLedgerApp.Views;
using Microsoft.Extensions.DependencyInjection;

namespace GoldLedgerApp;

public partial class App : Application
{
	private readonly IServiceProvider _services;

	public static IServiceProvider Services { get; private set; } = null!;

	public App(IServiceProvider services)
	{
		InitializeComponent();
		_services = Services = services;
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		return new Window(new NavigationPage(_services.GetRequiredService<LoginPage>())
		{
			BarBackgroundColor = Colors.Transparent,
			BarTextColor = Colors.Transparent
		});
	}

	public static void ShowMainApp()
	{
		if (Current?.Windows.Count > 0)
		{
			Current.Windows[0].Page = new AppShell();
		}
	}

	public static void ShowLogin()
	{
		if (Current?.Windows.Count > 0)
		{
			Current.Windows[0].Page = new NavigationPage(Services.GetRequiredService<LoginPage>())
			{
				BarBackgroundColor = Colors.Transparent,
				BarTextColor = Colors.Transparent
			};
		}
	}
}
