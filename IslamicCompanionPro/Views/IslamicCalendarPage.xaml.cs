using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class IslamicCalendarPage : AppearingContentPage
{
	public IslamicCalendarPage(IslamicCalendarViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
