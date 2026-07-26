namespace FXVolumeTrader.Core.Interfaces;

/// <summary>
/// ViewModel-first navigation service. The App project registers a
/// concrete implementation that resolves target view models via DI and
/// raises <see cref="CurrentViewModelChanged"/> so MainWindow can swap
/// the content region without any code-behind navigation logic.
/// </summary>
public interface INavigationService
{
    object? CurrentViewModel { get; }

    event EventHandler? CurrentViewModelChanged;

    void NavigateTo<TViewModel>() where TViewModel : class;

    void NavigateTo(Type viewModelType);
}
