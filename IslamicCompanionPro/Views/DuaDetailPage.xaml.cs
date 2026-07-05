using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class DuaDetailPage : AppearingContentPage
{
	public DuaDetailPage(DuaDetailViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
}
