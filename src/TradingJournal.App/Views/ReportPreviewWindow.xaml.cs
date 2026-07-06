using System.Windows;
using System.Windows.Documents;

namespace TradingJournal.App.Views;

public partial class ReportPreviewWindow : Window
{
    public ReportPreviewWindow(FlowDocument document)
    {
        InitializeComponent();
        Viewer.Document = document;
    }
}
