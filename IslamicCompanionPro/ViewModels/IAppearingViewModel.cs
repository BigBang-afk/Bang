using CommunityToolkit.Mvvm.Input;

namespace IslamicCompanionPro.ViewModels;

/// <summary>
/// Implemented (implicitly, via the [RelayCommand]-generated AppearingCommand) by ViewModels that
/// need to load/refresh data each time their page appears. Pages call this from OnAppearing()
/// instead of wiring an EventToCommandBehavior in XAML, keeping the code-behind trivial and testable.
/// </summary>
public interface IAppearingViewModel
{
	IAsyncRelayCommand AppearingCommand { get; }
}
