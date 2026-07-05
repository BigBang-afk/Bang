using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class SplashPage : AppearingContentPage
{
	public SplashPage(SplashViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
