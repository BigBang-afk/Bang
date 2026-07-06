using System;
using System.Windows;
using System.Windows.Controls;
using GeneralStorePro.ViewModels;

namespace GeneralStorePro.Views;

public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();

        var viewModel = new LoginViewModel();
        viewModel.LoginSucceeded += OnLoginSucceeded;
        DataContext = viewModel;
    }

    private void OnLoginSucceeded(object? sender, EventArgs e)
    {
        var shell = new MainWindow();
        Application.Current.MainWindow = shell;
        shell.Show();
        Close();
    }

    private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
    {
        if (DataContext is LoginViewModel viewModel && sender is PasswordBox passwordBox)
        {
            viewModel.Password = passwordBox.Password;
        }
    }
}
