using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Data.Repositories;
using GeneralStorePro.Models;

namespace GeneralStorePro.ViewModels;

public partial class SupplierEditorModel : ObservableObject
{
    public int Id { get; set; }

    [ObservableProperty]
    private string name = string.Empty;

    [ObservableProperty]
    private string phone = string.Empty;

    [ObservableProperty]
    private string address = string.Empty;

    [ObservableProperty]
    private decimal openingBalance;

    [ObservableProperty]
    private decimal currentBalance;
}

public partial class SuppliersViewModel : ViewModelBase
{
    public ObservableCollection<Supplier> Suppliers { get; } = new();

    public ICollectionView SuppliersView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private Supplier? selectedSupplier;

    [ObservableProperty]
    private bool isEditorOpen;

    [ObservableProperty]
    private bool isNewSupplier;

    [ObservableProperty]
    private SupplierEditorModel editor = new();

    [ObservableProperty]
    private string? statusMessage;

    public SuppliersViewModel()
    {
        SuppliersView = CollectionViewSource.GetDefaultView(Suppliers);
        SuppliersView.Filter = FilterSuppliers;
        LoadSuppliers();
    }

    partial void OnSearchTextChanged(string value) => SuppliersView.Refresh();

    partial void OnSelectedSupplierChanged(Supplier? value)
    {
        IsEditorOpen = value is not null;
        IsNewSupplier = false;
        StatusMessage = null;

        if (value is null)
        {
            return;
        }

        Editor = new SupplierEditorModel
        {
            Id = value.Id,
            Name = value.Name,
            Phone = value.Phone ?? string.Empty,
            Address = value.Address ?? string.Empty,
            OpeningBalance = value.OpeningBalance,
            CurrentBalance = value.CurrentBalance
        };
    }

    private void LoadSuppliers()
    {
        Suppliers.Clear();
        foreach (var supplier in SupplierRepository.GetActiveSuppliers())
        {
            Suppliers.Add(supplier);
        }

        SuppliersView.Refresh();
    }

    private bool FilterSuppliers(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is Supplier s &&
               (s.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                (s.Phone ?? string.Empty).Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddNew()
    {
        SelectedSupplier = null;
        Editor = new SupplierEditorModel();
        IsNewSupplier = true;
        IsEditorOpen = true;
        StatusMessage = null;
    }

    [RelayCommand]
    private void SaveSupplier()
    {
        if (string.IsNullOrWhiteSpace(Editor.Name))
        {
            StatusMessage = "Supplier name is required.";
            return;
        }

        if (IsNewSupplier)
        {
            var newId = SupplierRepository.Insert(new Supplier
            {
                Name = Editor.Name,
                Phone = Editor.Phone,
                Address = Editor.Address,
                OpeningBalance = Editor.OpeningBalance
            });

            LoadSuppliers();
            SelectedSupplier = Suppliers.FirstOrDefault(s => s.Id == newId);
        }
        else
        {
            SupplierRepository.Update(new Supplier
            {
                Id = Editor.Id,
                Name = Editor.Name,
                Phone = Editor.Phone,
                Address = Editor.Address
            });

            var savedId = Editor.Id;
            LoadSuppliers();
            SelectedSupplier = Suppliers.FirstOrDefault(s => s.Id == savedId);
        }

        StatusMessage = "Saved.";
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedSupplier is null)
        {
            return;
        }

        SupplierRepository.Deactivate(SelectedSupplier.Id);
        LoadSuppliers();
        SelectedSupplier = null;
    }

    [RelayCommand]
    private void CloseEditor() => SelectedSupplier = null;
}
