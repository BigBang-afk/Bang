using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class DuaCategoriesPage : AppearingContentPage
{
	public DuaCategoriesPage(DuaCategoriesViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
