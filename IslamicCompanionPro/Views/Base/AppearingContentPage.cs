using IslamicCompanionPro.ViewModels;

namespace IslamicCompanionPro.Views.Base;

/// <summary>
/// A ContentPage that automatically runs its ViewModel's AppearingCommand (see
/// <see cref="IAppearingViewModel"/>) every time the page appears, so individual page
/// code-behind files don't need to repeat this boilerplate.
/// </summary>
public class AppearingContentPage : ContentPage
{
	protected override void OnAppearing()
	{
		base.OnAppearing();

		if (BindingContext is IAppearingViewModel viewModel && viewModel.AppearingCommand.CanExecute(null))
		{
			viewModel.AppearingCommand.Execute(null);
		}
	}
}
