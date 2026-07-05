using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views.Base;

namespace IslamicCompanionPro.Views;

public partial class QiblaPage : AppearingContentPage
{
	private readonly QiblaViewModel _viewModel;

	public QiblaPage(QiblaViewModel viewModel)
	{
		InitializeComponent();
		_viewModel = viewModel;
		BindingContext = viewModel;
	}

	protected override void OnDisappearing()
	{
		base.OnDisappearing();
		_viewModel.DisappearingCommand.Execute(null);
	}
}
