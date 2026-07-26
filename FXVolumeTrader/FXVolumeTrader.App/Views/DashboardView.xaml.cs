using System.Windows.Controls;

namespace FXVolumeTrader.App.Views;

/// <summary>
/// Code-behind is intentionally empty - DashboardViewModel (set as
/// DataContext via the ViewTemplates DataTemplate) owns all state and
/// commands.
/// </summary>
public partial class DashboardView : UserControl
{
    public DashboardView()
    {
        InitializeComponent();
    }
}
