using System.Windows;
using FXVolumeTrader.App.ViewModels;

namespace FXVolumeTrader.App.Views;

/// <summary>
/// The application shell. Contains no business or navigation logic -
/// it only hosts MainWindowViewModel and lets data binding + DataTemplates
/// (Resources/ViewTemplates.xaml) do the rest.
/// </summary>
public partial class MainWindow : Window
{
    public MainWindow(MainWindowViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
    }
}
