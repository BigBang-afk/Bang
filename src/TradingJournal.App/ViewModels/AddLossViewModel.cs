using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class AddLossViewModel : AddEntryViewModelBase
{
    protected override EntryType Type => EntryType.Loss;

    public AddLossViewModel(
        ILedgerService ledgerService,
        ICustomerService customerService,
        ISettingsService settingsService,
        Action onSaved)
        : base(ledgerService, customerService, settingsService, onSaved)
    {
    }
}
