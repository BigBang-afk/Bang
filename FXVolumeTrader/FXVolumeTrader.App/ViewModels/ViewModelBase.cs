using CommunityToolkit.Mvvm.ComponentModel;

namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Shared base for all view models. Built on CommunityToolkit.Mvvm's
/// ObservableObject so derived view models get INotifyPropertyChanged
/// and [ObservableProperty]/[RelayCommand] source generation for free.
/// </summary>
public abstract partial class ViewModelBase : ObservableObject
{
    [ObservableProperty]
    private bool _isBusy;
}
