using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using ZarghoonJewellers.App.Models;
using ZarghoonJewellers.App.Repositories;

namespace ZarghoonJewellers.App.Views
{
    public partial class KarigarManagementView : UserControl
    {
        private readonly KarigarRepository _repo = new();
        private readonly ObservableCollection<Karigar> _items = new();
        private int? _editingId;

        public KarigarManagementView()
        {
            InitializeComponent();
            KarigarsGrid.ItemsSource = _items;
            Loaded += (_, _) => LoadGrid();
        }

        private void LoadGrid()
        {
            var list = _repo.GetAll(TxtSearch.Text);
            _items.Clear();
            foreach (var item in list) _items.Add(item);
        }

        private void TxtSearch_TextChanged(object sender, TextChangedEventArgs e) => LoadGrid();

        private void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            string name = TxtName.Text?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(name))
            {
                MessageBox.Show("Please enter the Karigar's name.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var karigar = new Karigar
            {
                Id = _editingId ?? 0,
                Name = name,
                Mobile = TxtMobile.Text?.Trim() ?? string.Empty,
                Address = TxtAddress.Text?.Trim() ?? string.Empty,
                Notes = TxtNotes.Text?.Trim() ?? string.Empty,
            };

            if (_editingId.HasValue)
                _repo.Update(karigar);
            else
                _repo.Add(karigar);

            ClearForm();
            LoadGrid();
        }

        private void EditRow_Click(object sender, RoutedEventArgs e)
        {
            var karigar = (Karigar)((FrameworkElement)sender).DataContext;
            _editingId = karigar.Id;

            TxtName.Text = karigar.Name;
            TxtMobile.Text = karigar.Mobile;
            TxtAddress.Text = karigar.Address;
            TxtNotes.Text = karigar.Notes;

            TxtFormTitle.Text = "Edit Karigar";
            BtnSave.Content = "Update Karigar";
        }

        private void DeleteRow_Click(object sender, RoutedEventArgs e)
        {
            var karigar = (Karigar)((FrameworkElement)sender).DataContext;

            var result = MessageBox.Show(
                $"Delete Karigar '{karigar.Name}'? This cannot be undone.",
                "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result != MessageBoxResult.Yes) return;

            bool deleted = _repo.Delete(karigar.Id);
            if (!deleted)
            {
                MessageBox.Show(
                    $"'{karigar.Name}' has existing Cash/Gold transactions and cannot be deleted.\n" +
                    "Remove or reassign those transactions first if you really need to delete this Karigar.",
                    "Cannot Delete", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_editingId == karigar.Id) ClearForm();
            LoadGrid();
        }

        private void BtnClear_Click(object sender, RoutedEventArgs e) => ClearForm();

        private void ClearForm()
        {
            _editingId = null;
            TxtName.Text = string.Empty;
            TxtMobile.Text = string.Empty;
            TxtAddress.Text = string.Empty;
            TxtNotes.Text = string.Empty;
            TxtFormTitle.Text = "Add Karigar";
            BtnSave.Content = "Save Karigar";
        }
    }
}
