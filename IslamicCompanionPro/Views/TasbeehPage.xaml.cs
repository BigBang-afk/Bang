using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class TasbeehPage : AppearingContentPage
{
	public TasbeehPage(TasbeehViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
