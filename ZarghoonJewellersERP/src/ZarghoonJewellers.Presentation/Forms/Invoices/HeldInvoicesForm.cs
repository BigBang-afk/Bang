using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// Recall screen: lists every invoice currently sitting in "Held" status (parked carts with
/// no stock/ledger impact yet) so the cashier can either resume one on the POS screen or
/// discard it outright.
/// </summary>
public class HeldInvoicesForm : Form
{
    private readonly IInvoiceService _invoiceService;
    private readonly DataGridView _grid;
    private IReadOnlyList<Invoice> _held = Array.Empty<Invoice>();

    public Invoice? RecalledInvoice { get; private set; }

    public HeldInvoicesForm(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;

        Text = "Held Invoices - Recall";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(720, 420);
        Font = new Font("Segoe UI", 9.5f);

        _grid = new DataGridView
        {
            Location = new Point(20, 20), Size = new Size(680, 320),
            BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, AllowUserToDeleteRows = false, ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, MultiSelect = false, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 32
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("InvoiceNumber", "Invoice #");
        _grid.Columns.Add("Label", "Hold Label");
        _grid.Columns.Add("Customer", "Customer");
        _grid.Columns.Add("Date", "Held At");
        _grid.Columns.Add("Total", "Total");
        Controls.Add(_grid);

        var btnRecall = new Guna2Button
        {
            Text = "RECALL TO POS", Location = new Point(20, 356), Size = new Size(220, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold)
        };
        btnRecall.Click += (_, _) => RecallSelected();
        Controls.Add(btnRecall);

        var btnDelete = new Guna2Button
        {
            Text = "DISCARD HELD INVOICE", Location = new Point(250, 356), Size = new Size(220, 42),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.Danger, BorderRadius = 8,
            Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
        };
        btnDelete.Click += async (_, _) => await DeleteSelectedAsync();
        Controls.Add(btnDelete);

        var btnClose = new Guna2Button
        {
            Text = "Close", Location = new Point(580, 356), Size = new Size(120, 42),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8,
            DialogResult = DialogResult.Cancel
        };
        Controls.Add(btnClose);

        Load += async (_, _) => await LoadAsync();
    }

    private async Task LoadAsync()
    {
        _held = await _invoiceService.GetHeldInvoicesAsync();
        _grid.Rows.Clear();
        foreach (var invoice in _held)
            _grid.Rows.Add(invoice.InvoiceNumber, invoice.HoldLabel, invoice.Customer?.FullName, invoice.CreatedDate.ToString("g"), invoice.TotalAmount.ToString("C0"));
    }

    private void RecallSelected()
    {
        if (_grid.CurrentRow is null || _grid.CurrentRow.Index >= _held.Count)
        {
            MessageBox.Show(this, "Select a held invoice first.", "Recall", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        RecalledInvoice = _held[_grid.CurrentRow.Index];
        DialogResult = DialogResult.OK;
        Close();
    }

    private async Task DeleteSelectedAsync()
    {
        if (_grid.CurrentRow is null || _grid.CurrentRow.Index >= _held.Count)
        {
            MessageBox.Show(this, "Select a held invoice first.", "Recall", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var invoice = _held[_grid.CurrentRow.Index];
        if (MessageBox.Show(this, $"Discard held invoice {invoice.InvoiceNumber}? This cannot be undone.", "Discard",
                MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes)
            return;

        try
        {
            await _invoiceService.DeleteHeldInvoiceAsync(invoice.InvoiceId);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not discard", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
