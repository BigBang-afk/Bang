using System;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Data.Repositories;
using GeneralStorePro.Models;
using GeneralStorePro.Services;

namespace GeneralStorePro.ViewModels;

public partial class ExpenseEditorModel : ObservableObject
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
    public ObservableCollection<Expense> Expenses { get; } = new();

    public ObservableCollection<string> PaymentMethods { get; } = new() { "Cash", "Card", "BankTransfer", "Other" };

    [ObservableProperty]
    private Expense? selectedExpense;

    [ObservableProperty]
    private bool isEditorOpen;

    [ObservableProperty]
    private ExpenseEditorModel editor = new();

    [ObservableProperty]
    private string? statusMessage;

    public decimal TotalExpenses => Expenses.Sum(e => e.Amount);

    public ExpensesViewModel() => LoadExpenses();

    private void LoadExpenses()
    {
        Expenses.Clear();
        foreach (var expense in ExpenseRepository.GetAll())
        {
            Expenses.Add(expense);
        }

        OnPropertyChanged(nameof(TotalExpenses));
    }

    [RelayCommand]
    private void AddNew()
    {
        Editor = new ExpenseEditorModel();
        IsEditorOpen = true;
        StatusMessage = null;
    }

    [RelayCommand]
    private void SaveExpense()
    {
        if (string.IsNullOrWhiteSpace(Editor.Category) || Editor.Amount <= 0)
        {
            StatusMessage = "Category and a positive amount are required.";
            return;
        }

        var userId = SessionService.CurrentUser?.Id
            ?? throw new InvalidOperationException("No user is signed in.");

        ExpenseRepository.Insert(
            new Expense
            {
                Category = Editor.Category,
                Description = Editor.Description,
                Amount = Editor.Amount,
                ExpenseDate = Editor.ExpenseDate,
                PaymentMethod = Editor.PaymentMethod
            },
            userId);

        LoadExpenses();
        IsEditorOpen = false;
    }

    [RelayCommand]
    private void CloseEditor() => IsEditorOpen = false;

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedExpense is null)
        {
            return;
        }

        ExpenseRepository.Delete(SelectedExpense.Id);
        LoadExpenses();
        SelectedExpense = null;
    }
}
