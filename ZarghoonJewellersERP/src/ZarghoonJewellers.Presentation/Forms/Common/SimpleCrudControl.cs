using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Common;

/// <summary>
/// A metadata-driven master-data list screen: toolbar (search/add/edit/delete/refresh) +
/// grid, driven by plain load/create/update/delete delegates and configured with just a
/// title, grid column descriptors and edit-field descriptors. The delegate-based design
/// (rather than binding directly to <see cref="ICrudService{TEntity}"/>) lets the same
/// screen shell be reused both for pure lookup tables (Karigar, Employees, Bank Accounts,
/// Expenses, Income, Settings, USDT Transactions - wired straight to the generic CRUD
/// service) and for entities like Customers/Suppliers that need their dedicated service
/// (code generation, balance initialization, audit logging) instead of the generic one.
/// Stock, Invoices and Purchases still get fully bespoke UIs because their workflows go
/// well beyond list-and-edit.
/// </summary>
public class SimpleCrudControl<TEntity> : UserControl, IAsyncLoadable where TEntity : class, new()
{
    private readonly Func<Task<IReadOnlyList<TEntity>>> _loadAll;
    private readonly Func<TEntity, Task> _create;
    private readonly Func<TEntity, Task> _update;
    private readonly Func<TEntity, Task> _delete;
    private readonly string _title;
    private readonly List<GridColumnDescriptor<TEntity>> _columns;
    private readonly List<FieldDescriptor<TEntity>> _editFields;
    private readonly Func<TEntity, bool>? _canDelete;

    private readonly Guna2Panel _pnlToolbar;
    private readonly Guna2TextBox _txtSearch;
    private readonly Guna2Button _btnAdd;
    private readonly Guna2Button _btnEdit;
    private readonly Guna2Button _btnDelete;
    private readonly Guna2Button _btnRefresh;
    private readonly DataGridView _grid;

    private IReadOnlyList<TEntity> _allItems = Array.Empty<TEntity>();

    /// <summary>Convenience constructor for entities served by the generic <see cref="ICrudService{TEntity}"/>.</summary>
    public SimpleCrudControl(ICrudService<TEntity> service, string title,
        List<GridColumnDescriptor<TEntity>> columns, List<FieldDescriptor<TEntity>> editFields,
        Func<TEntity, bool>? canDelete = null)
        : this(() => service.GetAllAsync(), e => service.CreateAsync(e), e => service.UpdateAsync(e), e => service.DeleteAsync(e),
              title, columns, editFields, canDelete)
    {
    }

    /// <summary>Full constructor for entities backed by a dedicated business service.</summary>
    public SimpleCrudControl(Func<Task<IReadOnlyList<TEntity>>> loadAll, Func<TEntity, Task> create,
        Func<TEntity, Task> update, Func<TEntity, Task> delete, string title,
        List<GridColumnDescriptor<TEntity>> columns, List<FieldDescriptor<TEntity>> editFields,
        Func<TEntity, bool>? canDelete = null)
    {
        _loadAll = loadAll;
        _create = create;
        _update = update;
        _delete = delete;
        _title = title;
        _columns = columns;
        _editFields = editFields;
        _canDelete = canDelete;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        _pnlToolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundDark };
        _txtSearch = new Guna2TextBox
        {
            PlaceholderText = $"Search {title.ToLowerInvariant()}...",
            Location = new Point(0, 8),
            Size = new Size(280, 38),
            FillColor = ThemeColors.BackgroundCard,
            ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle,
            BorderRadius = 8
        };
        _txtSearch.TextChanged += (_, _) => ApplyFilter();

        _btnAdd = CreateToolbarButton("+ Add", ThemeColors.GoldPrimary, ThemeColors.TextOnGold, 300);
        _btnEdit = CreateToolbarButton("Edit", ThemeColors.BackgroundCard, ThemeColors.TextPrimary, 400);
        _btnDelete = CreateToolbarButton("Delete", ThemeColors.BackgroundCard, ThemeColors.Danger, 480);
        _btnRefresh = CreateToolbarButton("⟳ Refresh", ThemeColors.BackgroundCard, ThemeColors.TextSecondary, 560);

        _btnAdd.Click += async (_, _) => await OnAddAsync();
        _btnEdit.Click += async (_, _) => await OnEditAsync();
        _btnDelete.Click += async (_, _) => await OnDeleteAsync();
        _btnRefresh.Click += async (_, _) => await LoadAsync();

        _pnlToolbar.Controls.Add(_txtSearch);
        _pnlToolbar.Controls.Add(_btnAdd);
        _pnlToolbar.Controls.Add(_btnEdit);
        _pnlToolbar.Controls.Add(_btnDelete);
        _pnlToolbar.Controls.Add(_btnRefresh);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill,
            BackgroundColor = ThemeColors.BackgroundCard,
            BorderStyle = BorderStyle.None,
            RowHeadersVisible = false,
            AllowUserToAddRows = false,
            AllowUserToDeleteRows = false,
            ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            MultiSelect = false,
            EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ColumnHeadersHeight = 36,
            RowTemplate = { Height = 32 }
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.DefaultCellStyle.SelectionBackColor = ThemeColors.BackgroundHover;
        _grid.DefaultCellStyle.SelectionForeColor = ThemeColors.GoldPrimary;

        foreach (var column in columns)
            _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = column.Header, Name = column.Header });

        var titleLabel = new Label
        {
            Text = title,
            Dock = DockStyle.Top,
            Height = 40,
            Font = ThemeColors.FontHeading,
            ForeColor = ThemeColors.TextPrimary,
            TextAlign = ContentAlignment.MiddleLeft
        };

        Controls.Add(_grid);
        Controls.Add(_pnlToolbar);
        Controls.Add(titleLabel);
    }

    private Guna2Button CreateToolbarButton(string text, Color fill, Color fore, int x)
    {
        return new Guna2Button
        {
            Text = text,
            Location = new Point(x, 8),
            Size = new Size(90, 38),
            FillColor = fill,
            ForeColor = fore,
            BorderRadius = 8,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold),
            HoverState = { FillColor = ThemeColors.BackgroundHover }
        };
    }

    public async Task LoadAsync()
    {
        _allItems = await _loadAll();
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var term = _txtSearch.Text.Trim();
        var filtered = string.IsNullOrEmpty(term)
            ? _allItems
            : _allItems.Where(item => _columns.Any(c => (c.ValueGetter(item)?.ToString() ?? string.Empty)
                .Contains(term, StringComparison.OrdinalIgnoreCase))).ToList();

        _grid.Rows.Clear();
        foreach (var item in filtered)
        {
            var rowIndex = _grid.Rows.Add(_columns.Select(c => c.ValueGetter(item)?.ToString() ?? string.Empty).ToArray());
            _grid.Rows[rowIndex].Tag = item;
        }
    }

    private TEntity? GetSelectedEntity()
        => _grid.SelectedRows.Count > 0 ? _grid.SelectedRows[0].Tag as TEntity : null;

    private async Task OnAddAsync()
    {
        var entity = new TEntity();
        using var dialog = new SimpleEditForm<TEntity>($"Add {_title}", entity, _editFields);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _create(dialog.Result);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task OnEditAsync()
    {
        var entity = GetSelectedEntity();
        if (entity is null)
        {
            MessageBox.Show(this, "Select a row to edit first.", _title, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using var dialog = new SimpleEditForm<TEntity>($"Edit {_title}", entity, _editFields);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _update(dialog.Result);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task OnDeleteAsync()
    {
        var entity = GetSelectedEntity();
        if (entity is null)
        {
            MessageBox.Show(this, "Select a row to delete first.", _title, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (_canDelete is not null && !_canDelete(entity))
        {
            MessageBox.Show(this, "This record cannot be deleted.", _title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        var confirm = MessageBox.Show(this, "Delete the selected record? This cannot be undone.", _title,
            MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        try
        {
            await _delete(entity);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not delete", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
