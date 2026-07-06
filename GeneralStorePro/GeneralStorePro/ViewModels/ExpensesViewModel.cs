using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public partial class ExpenseRow : ObservableObject
{
    [ObservableProperty]
    private DateTime expenseDate = DateTime.Now;

    [ObservableProperty]
    private string category = "Miscellaneous";

    [ObservableProperty]
    private string description = string.Empty;

    [ObservableProperty]
    private decimal amount;

    [ObservableProperty]
    private string paymentMethod = "Cash";
}

public partial class ExpensesViewModel : ViewModelBase
{
    public ObservableCollection<ExpenseRow> Expenses { get; } = new()
    {
        new() { ExpenseDate = DateTime.Now.AddDays(-1), Category = "Rent", Description = "Monthly shop rent", Amount = 800, PaymentMethod = "BankTransfer" },
        new() { ExpenseDate = DateTime.Now.AddDays(-2), Category = "Utilities", Description = "Electricity bill", Amount = 145.50m, PaymentMethod = "Cash" },
        new() { ExpenseDate = DateTime.Now.AddDays(-3), Category = "Salary", Description = "Cashier wages", Amount = 620, PaymentMethod = "Cash" }
    };

    [ObservableProperty]
    private ExpenseRow? selectedExpense;

    [ObservableProperty]
    private bool isEditorOpen;

    public decimal TotalExpenses => Sum();

    public ExpensesViewModel()
    {
        foreach (var expense in Expenses)
        {
            expense.PropertyChanged += OnExpenseChanged;
        }
    }

    partial void OnSelectedExpenseChanged(ExpenseRow? value) => IsEditorOpen = value is not null;

    private void OnExpenseChanged(object? sender, PropertyChangedEventArgs e) => OnPropertyChanged(nameof(TotalExpenses));

    private decimal Sum()
    {
        decimal total = 0;
        foreach (var expense in Expenses)
        {
            total += expense.Amount;
        }

        return total;
    }

    [RelayCommand]
    private void AddNew()
    {
        var row = new ExpenseRow();
        row.PropertyChanged += OnExpenseChanged;
        Expenses.Add(row);
        SelectedExpense = row;
        OnPropertyChanged(nameof(TotalExpenses));
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedExpense is null)
        {
            return;
        }

        SelectedExpense.PropertyChanged -= OnExpenseChanged;
        Expenses.Remove(SelectedExpense);
        SelectedExpense = null;
        OnPropertyChanged(nameof(TotalExpenses));
    }

    [RelayCommand]
    private void CloseEditor() => SelectedExpense = null;
}
