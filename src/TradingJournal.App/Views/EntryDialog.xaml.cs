using System.Windows;
using TradingJournal.App.ViewModels;

namespace TradingJournal.App.Views;

public partial class EntryDialog : Window
{
    public EntryDialog()
    {
        InitializeComponent();
        DataContextChanged += (_, e) =>
        {
            if (e.OldValue is EntryDialogViewModel oldVm)
                oldVm.RequestClose -= OnRequestClose;
            if (e.NewValue is EntryDialogViewModel newVm)
                newVm.RequestClose += OnRequestClose;
        };
    }

    private void OnRequestClose(object? sender, EventArgs e)
    {
        DialogResult = (DataContext as EntryDialogViewModel)?.Saved ?? false;
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
    }
}
