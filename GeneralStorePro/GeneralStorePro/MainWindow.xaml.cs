using System.Windows;
using GeneralStorePro.Services;
using GeneralStorePro.ViewModels;
using GeneralStorePro.Views;

namespace GeneralStorePro;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        var viewModel = new ShellViewModel();
        viewModel.LogoutRequested += OnLogoutRequested;
        DataContext = viewModel;
    }

    private void OnLogoutRequested(object? sender, System.EventArgs e)
    {
        SessionService.CurrentUser = null;

        var loginWindow = new LoginWindow();
        Application.Current.MainWindow = loginWindow;
        loginWindow.Show();
        Close();
    }
}
