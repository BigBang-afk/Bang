using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using ZarghoonJewellers.App.Helpers;
using ZarghoonJewellers.App.Models;
using ZarghoonJewellers.App.Repositories;

namespace ZarghoonJewellers.App.Views
{
    /// <summary>Shared screen for both Cash In and Cash Out, distinguished by the TransactionType passed in.</summary>
    public partial class CashTransactionView : UserControl
    {
        private readonly TransactionType _type;
        private readonly CashTransactionRepository _repo = new();
        private readonly KarigarRepository _karigarRepo = new();
        private readonly ObservableCollection<CashTransaction> _items = new();
        private int? _editingId;

        public CashTransactionView(TransactionType type)
        {
            InitializeComponent();
            _type = type;

            ConfigureForType();
            TransactionsGrid.ItemsSource = _items;
            DpDate.SelectedDate = DateTime.Today;

            Loaded += (_, _) =>
            {
                LoadKarigars();
                LoadGrid();
            };
        }

        private void ConfigureForType()
        {
            if (_type == TransactionType.In)
            {
                TxtPageTitle.Text = "Cash In";
                TxtPageSubtitle.Text = "Record money received by the shop";
            }
            else
            {
                TxtPageTitle.Text = "Cash Out";
                TxtPageSubtitle.Text = "Record money paid out by the shop";
            }
            TxtFormTitle.Text = _type == TransactionType.In ? "New Cash In Entry" : "New Cash Out Entry";
        }

        private void LoadKarigars()
        {
            CmbPerson.ItemsSource = _karigarRepo.GetAll();
        }

        private void LoadGrid()
        {
            var list = _repo.GetAll(_type, Filter.From, Filter.To, TxtSearch.Text);
            _items.Clear();
            foreach (var item in list) _items.Add(item);
        }

        private void Filter_FilterChanged(DateTime? from, DateTime? to) => LoadGrid();

        private void TxtSearch_TextChanged(object sender, TextChangedEventArgs e) => LoadGrid();

        private void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            if (DpDate.SelectedDate == null)
            {
                MessageBox.Show("Please select a date.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            string personText = (CmbPerson.SelectedItem as Karigar)?.Name ?? CmbPerson.Text?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(personText))
            {
                MessageBox.Show("Please enter or select a Person / Karigar.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!decimal.TryParse(TxtAmount.Text, out decimal amount) || amount <= 0)
            {
                MessageBox.Show("Please enter a valid amount greater than zero.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            int? karigarId = (CmbPerson.SelectedItem as Karigar)?.Id;
            if (karigarId == null && CmbPerson.ItemsSource is List<Karigar> karigars)
            {
                var match = karigars.FirstOrDefault(k => string.Equals(k.Name, personText, StringComparison.OrdinalIgnoreCase));
                karigarId = match?.Id;
            }

            var transaction = new CashTransaction
            {
                Id = _editingId ?? 0,
                Date = DpDate.SelectedDate.Value,
                Type = _type,
                KarigarId = karigarId,
                PersonName = personText,
                Description = TxtDescription.Text?.Trim() ?? string.Empty,
                Amount = amount,
                Notes = TxtNotes.Text?.Trim() ?? string.Empty,
            };

            if (_editingId.HasValue)
                _repo.Update(transaction);
            else
                _repo.Add(transaction);

            ClearForm();
            LoadGrid();
        }

        private void EditRow_Click(object sender, RoutedEventArgs e)
        {
            var transaction = (CashTransaction)((FrameworkElement)sender).DataContext;
            _editingId = transaction.Id;

            DpDate.SelectedDate = transaction.Date;
            TxtDescription.Text = transaction.Description;
            TxtAmount.Text = transaction.Amount.ToString("0.##");
            TxtNotes.Text = transaction.Notes;

            var karigars = CmbPerson.ItemsSource as List<Karigar>;
            var match = transaction.KarigarId.HasValue
                ? karigars?.FirstOrDefault(k => k.Id == transaction.KarigarId.Value)
                : null;

            if (match != null)
            {
                CmbPerson.SelectedItem = match;
            }
            else
            {
                CmbPerson.SelectedItem = null;
                CmbPerson.Text = transaction.PersonName;
            }

            TxtFormTitle.Text = _type == TransactionType.In ? "Edit Cash In Entry" : "Edit Cash Out Entry";
            BtnSave.Content = "Update";
        }

        private void DeleteRow_Click(object sender, RoutedEventArgs e)
        {
            var transaction = (CashTransaction)((FrameworkElement)sender).DataContext;
            string label = _type == TransactionType.In ? "Cash In" : "Cash Out";

            var result = MessageBox.Show(
                $"Delete this {label} entry of {Formatting.Cash(transaction.Amount)} dated {transaction.Date:dd-MMM-yyyy}?",
                "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result != MessageBoxResult.Yes) return;

            _repo.Delete(transaction.Id);
            if (_editingId == transaction.Id) ClearForm();
            LoadGrid();
        }

        private void BtnClear_Click(object sender, RoutedEventArgs e) => ClearForm();

        private void ClearForm()
        {
            _editingId = null;
            DpDate.SelectedDate = DateTime.Today;
            CmbPerson.SelectedItem = null;
            CmbPerson.Text = string.Empty;
            TxtDescription.Text = string.Empty;
            TxtAmount.Text = string.Empty;
            TxtNotes.Text = string.Empty;
            TxtFormTitle.Text = _type == TransactionType.In ? "New Cash In Entry" : "New Cash Out Entry";
            BtnSave.Content = "Save";
        }
    }
}
