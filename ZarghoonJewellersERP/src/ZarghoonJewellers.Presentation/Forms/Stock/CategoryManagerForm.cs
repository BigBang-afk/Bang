using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// Manage Categories &amp; Sub Categories dialog, opened from the Stock module's toolbar.
/// Needs a real Category dropdown for "parent" (to create a sub-category), which is why this
/// is a small bespoke screen rather than routed through <see cref="Common.SimpleCrudControl{TEntity}"/>
/// (whose generic edit form only offers plain text fields).
/// </summary>
public class CategoryManagerForm : Form
{
    private readonly ICrudService<StockCategory> _categoryService;
    private readonly DataGridView _grid;
    private List<StockCategory> _categories = new();

    public bool ChangesMade { get; private set; }

    public CategoryManagerForm(ICrudService<StockCategory> categoryService)
    {
        _categoryService = categoryService;

        Text = "Manage Categories";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(560, 480);
        Font = new Font("Segoe UI", 9.5f);

        var titleLabel = new Label { Text = "Categories & Sub Categories", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 13F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true };
        Controls.Add(titleLabel);

        var btnAdd = new Guna2Button { Text = "+ Add", Location = new Point(20, 56), Size = new Size(90, 36), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        var btnEdit = new Guna2Button { Text = "Edit", Location = new Point(118, 56), Size = new Size(90, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        var btnDelete = new Guna2Button { Text = "Delete", Location = new Point(216, 56), Size = new Size(90, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.Danger, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };

        btnAdd.Click += async (_, _) => await AddOrEditAsync(null);
        btnEdit.Click += async (_, _) => await AddOrEditAsync(GetSelected());
        btnDelete.Click += async (_, _) => await DeleteSelectedAsync();

        Controls.Add(btnAdd);
        Controls.Add(btnEdit);
        Controls.Add(btnDelete);

        _grid = new DataGridView
        {
            Location = new Point(20, 100), Size = new Size(520, 320),
            BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 32
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("Name", "Category");
        _grid.Columns.Add("Parent", "Parent (blank = top-level)");
        Controls.Add(_grid);

        var btnClose = new Guna2Button { Text = "CLOSE", Location = new Point(440, 432), Size = new Size(100, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8, DialogResult = DialogResult.OK };
        Controls.Add(btnClose);
        AcceptButton = btnClose;

        Load += async (_, _) => await ReloadAsync();
    }

    private async Task ReloadAsync()
    {
        _categories = (await _categoryService.GetAllAsync()).OrderBy(c => c.CategoryName).ToList();
        _grid.Rows.Clear();
        foreach (var category in _categories)
        {
            var parentName = category.ParentCategoryId is null ? string.Empty
                : _categories.FirstOrDefault(c => c.CategoryId == category.ParentCategoryId)?.CategoryName ?? string.Empty;
            var rowIndex = _grid.Rows.Add(category.CategoryName, parentName);
            _grid.Rows[rowIndex].Tag = category;
        }
    }

    private StockCategory? GetSelected() => _grid.SelectedRows.Count > 0 ? _grid.SelectedRows[0].Tag as StockCategory : null;

    private async Task AddOrEditAsync(StockCategory? existing)
    {
        var category = existing ?? new StockCategory();
        using var dialog = new CategoryEditForm(category, _categories.Where(c => c.CategoryId != existing?.CategoryId).ToList());
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            if (existing is null)
                await _categoryService.CreateAsync(dialog.Result);
            else
                await _categoryService.UpdateAsync(dialog.Result);

            ChangesMade = true;
            await ReloadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task DeleteSelectedAsync()
    {
        var category = GetSelected();
        if (category is null)
        {
            MessageBox.Show(this, "Select a category first.", "Manage Categories", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (_categories.Any(c => c.ParentCategoryId == category.CategoryId))
        {
            MessageBox.Show(this, "This category still has sub-categories under it and cannot be deleted.",
                "Manage Categories", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (MessageBox.Show(this, $"Delete category '{category.CategoryName}'?", "Manage Categories", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return;

        try
        {
            await _categoryService.DeleteAsync(category);
            ChangesMade = true;
            await ReloadAsync();
        }
        catch (Exception)
        {
            // Most likely cause: stock items still reference this category (FK_Stock_StockCategories
            // is ON DELETE RESTRICT) - the generic repository doesn't eagerly load StockItems, so
            // this is caught here rather than pre-checked in memory.
            MessageBox.Show(this, "This category could not be deleted - it is still in use by one or more stock items.",
                "Could not delete", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}

/// <summary>Add/edit dialog for one category, with a real dropdown for the optional parent category.</summary>
internal class CategoryEditForm : Form
{
    private readonly StockCategory _category;
    private readonly Guna2TextBox _txtName;
    private readonly Guna2TextBox _txtDescription;
    private readonly Guna2ComboBox _cmbParent;
    private readonly List<StockCategory?> _parentOptions;

    public CategoryEditForm(StockCategory category, IReadOnlyList<StockCategory> availableParents)
    {
        _category = category;

        Text = category.CategoryId == 0 ? "Add Category" : "Edit Category";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(380, 260);
        Font = new Font("Segoe UI", 9.5f);

        Controls.Add(new Label { Text = "CATEGORY NAME", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true });
        _txtName = new Guna2TextBox { Location = new Point(20, 34), Size = new Size(340, 36), Text = category.CategoryName, FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        Controls.Add(_txtName);

        Controls.Add(new Label { Text = "DESCRIPTION", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 78), AutoSize = true });
        _txtDescription = new Guna2TextBox { Location = new Point(20, 96), Size = new Size(340, 36), Text = category.Description ?? string.Empty, FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        Controls.Add(_txtDescription);

        Controls.Add(new Label { Text = "PARENT CATEGORY (leave blank for a top-level category)", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 140), AutoSize = true });
        _cmbParent = new Guna2ComboBox { Location = new Point(20, 158), Size = new Size(340, 36), DropDownStyle = ComboBoxStyle.DropDownList, FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        _parentOptions = new List<StockCategory?> { null };
        _parentOptions.AddRange(availableParents.Where(c => c.ParentCategoryId is null));
        _cmbParent.DataSource = _parentOptions.Select(c => c?.CategoryName ?? "— Top Level —").ToList();
        var currentIndex = category.ParentCategoryId is null ? 0 : _parentOptions.FindIndex(c => c?.CategoryId == category.ParentCategoryId);
        _cmbParent.SelectedIndex = currentIndex >= 0 ? currentIndex : 0;
        Controls.Add(_cmbParent);

        var btnSave = new Guna2Button { Text = "SAVE", Location = new Point(140, 210), Size = new Size(105, 40), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK };
        btnSave.Click += (_, _) => ApplyValues();
        var btnCancel = new Guna2Button { Text = "CANCEL", Location = new Point(255, 210), Size = new Size(105, 40), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8, DialogResult = DialogResult.Cancel };

        Controls.Add(btnSave);
        Controls.Add(btnCancel);
        AcceptButton = btnSave;
        CancelButton = btnCancel;
    }

    private void ApplyValues()
    {
        _category.CategoryName = _txtName.Text.Trim();
        _category.Description = string.IsNullOrWhiteSpace(_txtDescription.Text) ? null : _txtDescription.Text.Trim();
        _category.ParentCategoryId = _cmbParent.SelectedIndex >= 0 ? _parentOptions[_cmbParent.SelectedIndex]?.CategoryId : null;
    }

    public StockCategory Result => _category;
}
