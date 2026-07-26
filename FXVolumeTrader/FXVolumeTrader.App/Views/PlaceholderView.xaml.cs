using System.Windows.Controls;

namespace FXVolumeTrader.App.Views;

/// <summary>
/// Shared view for every not-yet-implemented navigation page. The
/// DataContext (a PlaceholderViewModelBase subclass) supplies the title
/// and phase note; this class has no logic of its own.
/// </summary>
public partial class PlaceholderView : UserControl
{
    public PlaceholderView()
    {
        InitializeComponent();
    }
}
