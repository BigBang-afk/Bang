using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.RepairOrders;

/// <summary>Repair/alteration job tracker: create new intake orders, and move existing ones
/// through Pending -> InProgress -> Completed -> Delivered via <see cref="IRepairOrderService.UpdateStatusAsync"/>.</summary>
public class UcRepairOrders : UserControl, IAsyncLoadable
{
    private readonly IRepairOrderService _repairOrderService;
    private readonly ICustomerService _customerService;
    private readonly ICrudService<Karigar> _karigarService;
    private readonly CurrentSession _session;

    private readonly DataGridView _grid;
    private IReadOnlyList<Customer> _customers = Array.Empty<Customer>();
    private IReadOnlyList<Karigar> _karigars = Array.Empty<Karigar>();

    public UcRepairOrders(IRepairOrderService repairOrderService, ICustomerService customerService,
        ICrudService<Karigar> karigarService, CurrentSession session)
    {
        _repairOrderService = repairOrderService;
        _customerService = customerService;
        _karigarService = karigarService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Repair Orders", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var toolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundDark };
        var btnNew = new Guna2Button { Text = "+ New Order", Location = new Point(0, 8), Size = new Size(120, 38), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnNew.Click += async (_, _) => await CreateOrderAsync();

        var btnAdvance = new Guna2Button { Text = "Advance Status", Location = new Point(130, 8), Size = new Size(140, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnAdvance.Click += async (_, _) => await AdvanceStatusAsync();

        var btnRefresh = new Guna2Button { Text = "⟳ Refresh", Location = new Point(280, 8), Size = new Size(100, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnRefresh.Click += async (_, _) => await LoadAsync();

        toolbar.Controls.Add(btnNew);
        toolbar.Controls.Add(btnAdvance);
        toolbar.Controls.Add(btnRefresh);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("OrderNumber", "Order #");
        _grid.Columns.Add("Customer", "Customer");
        _grid.Columns.Add("Item", "Item");
        _grid.Columns.Add("Karigar", "Karigar");
        _grid.Columns.Add("Promised", "Promised Date");
        _grid.Columns.Add("Status", "Status");

        Controls.Add(_grid);
        Controls.Add(toolbar);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        _customers = await _customerService.GetAllAsync();
        _karigars = await _karigarService.GetAllAsync();

        var orders = await _repairOrderService.GetAllAsync();
        _grid.Rows.Clear();
        foreach (var order in orders.OrderByDescending(o => o.ReceivedDate))
        {
            var rowIndex = _grid.Rows.Add(order.OrderNumber, order.Customer?.FullName, order.ItemDescription,
                order.Karigar?.FullName ?? "-", order.PromisedDate?.ToString("d") ?? "-", order.Status);
            _grid.Rows[rowIndex].Tag = order;
        }
    }

    private async Task CreateOrderAsync()
    {
        if (_customers.Count == 0)
        {
            MessageBox.Show(this, "Add at least one customer first.", "Repair Orders", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var order = new RepairOrder { CreatedBy = _session.UserId };
        using var dialog = new RepairOrderEditForm(order, _customers.Where(c => c.IsActive).ToList(), _karigars.Where(k => k.IsActive).ToList());
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _repairOrderService.CreateAsync(dialog.Result);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not create order", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task AdvanceStatusAsync()
    {
        if (_grid.SelectedRows.Count == 0 || _grid.SelectedRows[0].Tag is not RepairOrder order)
        {
            MessageBox.Show(this, "Select an order first.", "Repair Orders", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var nextStatus = order.Status switch
        {
            "Pending" => "InProgress",
            "InProgress" => "Completed",
            "Completed" => "Delivered",
            _ => (string?)null
        };

        if (nextStatus is null)
        {
            MessageBox.Show(this, "This order has already reached its final status.", "Repair Orders", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            await _repairOrderService.UpdateStatusAsync(order.RepairOrderId, nextStatus);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not update status", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
