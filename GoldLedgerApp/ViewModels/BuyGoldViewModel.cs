using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class BuyGoldViewModel : GoldTransactionViewModel
{
	public override TransactionType Type => TransactionType.Buy;

	public BuyGoldViewModel(DatabaseService db, SettingsService settings) : base(db, settings)
	{
		Title = "Buy Gold";
	}
}
