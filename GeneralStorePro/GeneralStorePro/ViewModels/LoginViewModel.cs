using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Services;

namespace GeneralStorePro.ViewModels;

public partial class LoginViewModel : ViewModelBase
{
    [ObservableProperty]
    private string username = string.Empty;

    [ObservableProperty]
    private string password = string.Empty;

    [ObservableProperty]
    private string? errorMessage;

    [ObservableProperty]
    private bool isBusy;

    public event EventHandler? LoginSucceeded;

    [RelayCommand]
    private void Login()
    {
        ErrorMessage = null;

        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Enter both username and password.";
            return;
        }

        IsBusy = true;
        try
        {
            var user = AuthService.ValidateCredentials(Username.Trim(), Password);
            if (user is null)
            {
                ErrorMessage = "Invalid username or password.";
                return;
            }

            SessionService.CurrentUser = user;
            LoginSucceeded?.Invoke(this, EventArgs.Empty);
        }
        finally
        {
            IsBusy = false;
        }
    }
}
