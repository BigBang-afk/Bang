using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class AddProfitViewModel : AddEntryViewModelBase
{
    protected override EntryType Type => EntryType.Profit;

    public AddProfitViewModel(
        ILedgerService ledgerService,
        ICustomerService customerService,
        ISettingsService settingsService,
        Action onSaved)
        : base(ledgerService, customerService, settingsService, onSaved)
    {
    }
}
