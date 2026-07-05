using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class PrayerTimesPage : AppearingContentPage
{
	public PrayerTimesPage(PrayerTimesViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
