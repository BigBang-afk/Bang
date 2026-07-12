using System.Windows;
using TradingPortfolioDashboard.Models;
using TradingPortfolioDashboard.ViewModels;

namespace TradingPortfolioDashboard.Views;

public partial class AddTradeWindow : Window
{
    private readonly Trade _trade;
    private readonly AddTradeViewModel _viewModel;

    public Trade? Result { get; private set; }

    public AddTradeWindow(Trade trade)
    {
        InitializeComponent();

        _trade = trade;
        _viewModel = new AddTradeViewModel(trade);
        _viewModel.RequestClose += OnRequestClose;
        DataContext = _viewModel;

        Title = string.IsNullOrEmpty(trade.Symbol) ? "Add Trade" : "Edit Trade";
    }

    private void OnRequestClose()
    {
        if (_viewModel.DialogAccepted)
        {
            _viewModel.ApplyTo(_trade);
            Result = _trade;
            DialogResult = true;
        }
        else
        {
            DialogResult = false;
        }
    }
}
