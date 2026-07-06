using System;
using System.Windows;
using GeneralStorePro.Data;
using GeneralStorePro.Views;

namespace GeneralStorePro;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        try
        {
            DatabaseInitializer.Initialize();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Failed to initialize the database:\n{ex.Message}",
                "GeneralStorePro - Startup Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Shutdown(-1);
            return;
        }

        var loginWindow = new LoginWindow();
        MainWindow = loginWindow;
        loginWindow.Show();
    }
}
