using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class OnboardingPage : AppearingContentPage
{
	public OnboardingPage(OnboardingViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
