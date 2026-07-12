using System.Windows.Controls;
using TradingPortfolioDashboard.Models;
using TradingPortfolioDashboard.ViewModels;

namespace TradingPortfolioDashboard.Views;

public partial class DashboardView : UserControl
{
    public DashboardView()
    {
        InitializeComponent();
    }

    private void PositionsGrid_CellEditEnding(object sender, DataGridCellEditEndingEventArgs e)
    {
        if (e.EditAction != DataGridEditAction.Commit)
        {
            return;
        }

        if (DataContext is not DashboardViewModel viewModel || e.Row.Item is not Position position)
        {
            return;
        }

        // The bound value hasn't been pushed back to the source yet at this point in the event,
        // so defer the persist call until the edit has actually committed.
        Dispatcher.BeginInvoke(() => viewModel.UpdatePrice(position));
    }
}
