using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;
using TradingPortfolioDashboard.Models;
using TradingPortfolioDashboard.Services;
using TradingPortfolioDashboard.Views;

namespace TradingPortfolioDashboard.ViewModels;

public partial class TradesViewModel : ObservableObject
{
    private readonly PortfolioService _portfolioService;

    public ObservableCollection<Trade> Trades => _portfolioService.Trades;

    [ObservableProperty] private Trade? _selectedTrade;
    [ObservableProperty] private string _statusMessage = string.Empty;

    public TradesViewModel(PortfolioService portfolioService)
    {
        _portfolioService = portfolioService;
    }

    [RelayCommand]
    private void AddTrade()
    {
        var dialog = new AddTradeWindow(new Trade { Date = DateTime.Now })
        {
            Owner = Application.Current.MainWindow
        };

        if (dialog.ShowDialog() == true)
        {
            _portfolioService.AddTrade(dialog.Result!);
            StatusMessage = $"Added {dialog.Result!.Symbol} trade.";
        }
    }

    [RelayCommand]
    private void EditTrade()
    {
        if (SelectedTrade is null)
        {
            return;
        }

        var dialog = new AddTradeWindow(SelectedTrade)
        {
            Owner = Application.Current.MainWindow
        };

        if (dialog.ShowDialog() == true)
        {
            _portfolioService.UpdateTrade(SelectedTrade);
            // Trade is a plain POCO (no INotifyPropertyChanged), so in-place edits need an
            // explicit view refresh for the grid to pick up the new cell values.
            CollectionViewSource.GetDefaultView(Trades).Refresh();
            StatusMessage = $"Updated {SelectedTrade.Symbol} trade.";
        }
    }

    [RelayCommand]
    private void DeleteTrade()
    {
        if (SelectedTrade is null)
        {
            return;
        }

        var result = MessageBox.Show(
            $"Delete {SelectedTrade.Side} {SelectedTrade.Quantity} {SelectedTrade.Symbol}?",
            "Confirm Delete",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (result == MessageBoxResult.Yes)
        {
            _portfolioService.DeleteTrade(SelectedTrade);
            StatusMessage = "Trade deleted.";
        }
    }

    [RelayCommand]
    private void ImportCsv()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "CSV files (*.csv)|*.csv|All files (*.*)|*.*",
            Title = "Import Trades from CSV"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        try
        {
            var trades = CsvImportService.Import(dialog.FileName);
            var count = _portfolioService.ImportTrades(trades);
            StatusMessage = $"Imported {count} trade(s) from {System.IO.Path.GetFileName(dialog.FileName)}.";
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Import Failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
