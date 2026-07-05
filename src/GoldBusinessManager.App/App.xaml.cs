namespace GoldBusinessManager.App;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        // Follow the device's light/dark setting by default; Settings > Dark Mode can override this later.
        UserAppTheme = AppTheme.Unspecified;

        MainPage = new MainPage();
    }
}
