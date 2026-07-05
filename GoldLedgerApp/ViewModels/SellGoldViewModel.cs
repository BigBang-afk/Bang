using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class SellGoldViewModel : GoldTransactionViewModel
{
	public override TransactionType Type => TransactionType.Sell;

	public SellGoldViewModel(DatabaseService db, SettingsService settings) : base(db, settings)
	{
		Title = "Sell Gold";
	}
}
