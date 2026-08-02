using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// Lets the cashier split one checkout across several payment methods (Cash, Bank, Card,
/// JazzCash, EasyPaisa, USDT) - each row becomes a <see cref="PaymentLineRequest"/>. The
/// invoice total may be paid in full, partially (the remainder becomes Balance Due) or, in
/// rare cases, an advance may exceed what's owed on this cart alone - the caller (checkout)
/// still enforces the hard "paid can't exceed total" rule, so this dialog only surfaces the
/// running total/remaining figures without blocking on them itself.
/// </summary>
public class SplitPaymentForm : Form
{
    public static readonly string[] SupportedMethods = { "Cash", "Bank", "Card", "JazzCash", "EasyPaisa", "USDT" };

    private readonly decimal _invoiceTotal;
    private readonly IReadOnlyList<BankAccount> _bankAccounts;
    private readonly DataGridView _grid;
    private readonly Label _lblEntered;
    private readonly Label _lblRemaining;

    public List<PaymentLineRequest> Payments { get; } = new();

    public SplitPaymentForm(decimal invoiceTotal, decimal prefillAmount, string prefillMethod, IReadOnlyList<BankAccount> bankAccounts)
    {
        _invoiceTotal = invoiceTotal;
        _bankAccounts = bankAccounts;

        Text = "Split Payment";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(620, 440);
        Font = new Font("Segoe UI", 9.5f);

        var lblTitle = new Label
        {
            Text = $"Invoice Total: {invoiceTotal:C0}", ForeColor = ThemeColors.GoldPrimary,
            Font = new Font("Segoe UI Semibold", 13F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true
        };
        Controls.Add(lblTitle);

        _grid = new DataGridView
        {
            Location = new Point(20, 56), Size = new Size(580, 260),
            BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ColumnHeadersHeight = 32, RowTemplate = { Height = 30 }, EditMode = DataGridViewEditMode.EditOnEnter
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;

        var methodColumn = new DataGridViewComboBoxColumn
        {
            Name = "Method", HeaderText = "Payment Method", DataSource = SupportedMethods, Width = 160
        };
        _grid.Columns.Add(methodColumn);
        _grid.Columns.Add("Amount", "Amount");
        _grid.Columns.Add("Reference", "Reference #");

        var bankColumn = new DataGridViewComboBoxColumn
        {
            Name = "BankAccount", HeaderText = "Bank Account", Width = 160,
            DataSource = bankAccounts, DisplayMember = nameof(BankAccount.AccountTitle), ValueMember = nameof(BankAccount.BankAccountId)
        };
        _grid.Columns.Add(bankColumn);

        var removeColumn = new DataGridViewButtonColumn { HeaderText = "", Text = "Remove", UseColumnTextForButtonValue = true, Name = "Remove", Width = 80 };
        _grid.Columns.Add(removeColumn);

        _grid.CellContentClick += (_, e) =>
        {
            if (e.RowIndex < 0 || _grid.Columns[e.ColumnIndex].Name != "Remove") return;
            _grid.Rows.RemoveAt(e.RowIndex);
            RecalculateTotals();
        };
        _grid.CellValueChanged += (_, _) => RecalculateTotals();
        _grid.CurrentCellDirtyStateChanged += (_, _) => { if (_grid.IsCurrentCellDirty) _grid.CommitEdit(DataGridViewDataErrorContexts.Commit); };

        Controls.Add(_grid);

        _grid.Rows.Add(prefillMethod, prefillAmount > 0 ? prefillAmount.ToString("0.00") : "0", null, null, "Remove");

        var btnAddRow = new Guna2Button
        {
            Text = "+ Add Payment Line", Location = new Point(20, 326), Size = new Size(180, 34),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6,
            Font = new Font("Segoe UI", 8.5F, FontStyle.Bold)
        };
        btnAddRow.Click += (_, _) => { _grid.Rows.Add("Cash", "0", null, null, "Remove"); RecalculateTotals(); };
        Controls.Add(btnAddRow);

        _lblEntered = new Label { Location = new Point(220, 332), ForeColor = ThemeColors.TextSecondary, AutoSize = true };
        _lblRemaining = new Label { Location = new Point(420, 332), ForeColor = ThemeColors.TextSecondary, AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
        Controls.Add(_lblEntered);
        Controls.Add(_lblRemaining);

        var btnOk = new Guna2Button
        {
            Text = "CONFIRM PAYMENT", Location = new Point(20, 376), Size = new Size(580, 44),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10.5F, FontStyle.Bold)
        };
        btnOk.Click += (_, _) => ApplyAndClose();
        Controls.Add(btnOk);
        AcceptButton = btnOk;

        RecalculateTotals();
    }

    private void RecalculateTotals()
    {
        decimal entered = 0;
        foreach (DataGridViewRow row in _grid.Rows)
        {
            if (decimal.TryParse(row.Cells["Amount"].Value?.ToString(), out var amount))
                entered += amount;
        }

        _lblEntered.Text = $"Entered: {entered:C0}";
        var remaining = _invoiceTotal - entered;
        _lblRemaining.Text = remaining > 0 ? $"Balance Due: {remaining:C0}" : (remaining < 0 ? $"Over by: {-remaining:C0}" : "Fully Paid");
        _lblRemaining.ForeColor = remaining > 0 ? ThemeColors.Warning : (remaining < 0 ? ThemeColors.Danger : ThemeColors.Success);
    }

    private void ApplyAndClose()
    {
        Payments.Clear();
        decimal entered = 0;

        foreach (DataGridViewRow row in _grid.Rows)
        {
            var method = row.Cells["Method"].Value?.ToString();
            if (string.IsNullOrWhiteSpace(method)) continue;
            if (!decimal.TryParse(row.Cells["Amount"].Value?.ToString(), out var amount) || amount <= 0) continue;

            int? bankAccountId = row.Cells["BankAccount"].Value is int id ? id : null;

            Payments.Add(new PaymentLineRequest
            {
                PaymentMethod = method,
                Amount = amount,
                ReferenceNumber = row.Cells["Reference"].Value?.ToString(),
                BankAccountId = bankAccountId
            });
            entered += amount;
        }

        if (Payments.Count == 0)
        {
            MessageBox.Show(this, "Enter at least one payment line with an amount.", "Split Payment", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (entered > _invoiceTotal)
        {
            MessageBox.Show(this, "Total entered cannot exceed the invoice amount.", "Split Payment", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        DialogResult = DialogResult.OK;
        Close();
    }
}
