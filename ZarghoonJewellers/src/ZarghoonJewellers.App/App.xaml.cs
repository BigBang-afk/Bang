using System.Windows;
using ZarghoonJewellers.App.Data;

namespace ZarghoonJewellers.App
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            try
            {
                DatabaseInitializer.Initialize();
            }
            catch (System.Exception ex)
            {
                MessageBox.Show(
                    "Failed to initialize the local database.\n\n" + ex.Message,
                    "Zarghoon Jewellers - Startup Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                Shutdown();
            }
        }
    }
}
