using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TradingPortfolioDashboard.Models;

namespace TradingPortfolioDashboard.ViewModels;

public partial class AddTradeViewModel : ObservableObject
{
    [ObservableProperty] private string _symbol = string.Empty;
    [ObservableProperty] private TradeSide _side = TradeSide.Buy;
    [ObservableProperty] private decimal _quantity;
    [ObservableProperty] private decimal _price;
    [ObservableProperty] private decimal _fees;
    [ObservableProperty] private DateTime _date = DateTime.Now;
    [ObservableProperty] private string? _notes;
    [ObservableProperty] private string _errorMessage = string.Empty;

    public event Action? RequestClose;

    public bool DialogAccepted { get; private set; }

    public IReadOnlyList<TradeSide> Sides { get; } = new[] { TradeSide.Buy, TradeSide.Sell };

    public AddTradeViewModel(Trade? existing)
    {
        if (existing is not null)
        {
            Symbol = existing.Symbol;
            Side = existing.Side;
            Quantity = existing.Quantity;
            Price = existing.Price;
            Fees = existing.Fees;
            Date = existing.Date;
            Notes = existing.Notes;
        }
    }

    [RelayCommand]
    private void Save()
    {
        if (string.IsNullOrWhiteSpace(Symbol))
        {
            ErrorMessage = "Symbol is required.";
            return;
        }

        if (Quantity <= 0)
        {
            ErrorMessage = "Quantity must be greater than zero.";
            return;
        }

        if (Price <= 0)
        {
            ErrorMessage = "Price must be greater than zero.";
            return;
        }

        Symbol = Symbol.Trim().ToUpperInvariant();
        DialogAccepted = true;
        RequestClose?.Invoke();
    }

    [RelayCommand]
    private void Cancel()
    {
        DialogAccepted = false;
        RequestClose?.Invoke();
    }

    public void ApplyTo(Trade trade)
    {
        trade.Symbol = Symbol;
        trade.Side = Side;
        trade.Quantity = Quantity;
        trade.Price = Price;
        trade.Fees = Fees;
        trade.Date = Date;
        trade.Notes = Notes;
    }
}
