using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class MonthlyPrayerTimesPage : AppearingContentPage
{
	public MonthlyPrayerTimesPage(MonthlyPrayerTimesViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
