using System.Windows;
using TradingJournal.App.Common;
using TradingJournal.App.ViewModels;
using TradingJournal.App.Views;
using TradingJournal.Core.Data;
using TradingJournal.Core.Services;

namespace TradingJournal.App;

public partial class App : Application
{
    private JournalDbContext? _db;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var dbPath = AppPaths.GetDatabasePath();
        _db = new JournalDbContext(dbPath);
        _db.Database.EnsureCreated();

        ISettingsService settingsService = new SettingsService(_db);
        ICustomerService customerService = new CustomerService(_db);
        ILedgerService ledgerService = new LedgerService(_db, settingsService);
        var entryDialogService = new EntryDialogService(ledgerService, settingsService, customerService);

        var mainViewModel = new MainViewModel(ledgerService, customerService, settingsService, entryDialogService);

        var mainWindow = new MainWindow
        {
            DataContext = mainViewModel
        };
        mainWindow.Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _db?.Dispose();
        base.OnExit(e);
    }
}
