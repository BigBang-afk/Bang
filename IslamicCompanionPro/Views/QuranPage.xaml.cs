using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class QuranPage : AppearingContentPage
{
	public QuranPage(QuranViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
