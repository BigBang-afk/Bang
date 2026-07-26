using FXVolumeTrader.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// ViewModel-first navigation: resolves the requested view model from the
/// DI container and exposes it as CurrentViewModel. MainWindow binds a
/// ContentControl to CurrentViewModel; DataTemplates (see
/// Resources/ViewTemplates.xaml) pick the matching View. No code-behind
/// navigation logic is required in any window or page.
/// </summary>
public sealed class NavigationService : INavigationService
{
    private readonly IServiceProvider _serviceProvider;

    public NavigationService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public object? CurrentViewModel { get; private set; }

    public event EventHandler? CurrentViewModelChanged;

    public void NavigateTo<TViewModel>() where TViewModel : class => NavigateTo(typeof(TViewModel));

    public void NavigateTo(Type viewModelType)
    {
        CurrentViewModel = _serviceProvider.GetRequiredService(viewModelType);
        CurrentViewModelChanged?.Invoke(this, EventArgs.Empty);
    }
}
