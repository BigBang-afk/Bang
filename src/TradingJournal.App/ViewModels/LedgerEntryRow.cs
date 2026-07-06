using TradingJournal.Core.Models;

namespace TradingJournal.App.ViewModels;

public record LedgerEntryRow(LedgerEntry Entry, decimal RunningBalancePkr);
