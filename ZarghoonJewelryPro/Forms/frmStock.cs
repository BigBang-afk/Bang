using System;
using System.Data;
using System.Globalization;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmStock : Form
    {
        private int _selectedStockId = 0;

        public frmStock()
        {
            InitializeComponent();
        }

        private void frmStock_Load(object sender, EventArgs e)
        {
            LoadCategories();
            LoadKarats();
            LoadStock(null);
        }

        private void LoadCategories()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT CategoryID, CategoryName FROM categories ORDER BY CategoryName";
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        DataTable table = new DataTable();
                        adapter.Fill(table);
                        cboCategory.DataSource = table;
                        cboCategory.DisplayMember = "CategoryName";
                        cboCategory.ValueMember = "CategoryID";
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show("Database error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoadKarats()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT KaratID, KaratName FROM karats ORDER BY KaratName DESC";
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        DataTable table = new DataTable();
                        adapter.Fill(table);
                        cboKarat.DataSource = table;
                        cboKarat.DisplayMember = "KaratName";
                        cboKarat.ValueMember = "KaratID";
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show("Database error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoadStock(string searchTerm)
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query =
                        "SELECT s.StockID, s.ItemCode, s.ItemName, s.CategoryID, c.CategoryName, " +
                        "s.KaratID, k.KaratName, s.Weight, s.MakingCharges, s.Quantity " +
                        "FROM stock s " +
                        "LEFT JOIN categories c ON s.CategoryID = c.CategoryID " +
                        "LEFT JOIN karats k ON s.KaratID = k.KaratID";

                    if (!string.IsNullOrEmpty(searchTerm))
                    {
                        query += " WHERE s.ItemCode LIKE @Term OR s.ItemName LIKE @Term";
                    }

                    query += " ORDER BY s.ItemName";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        if (!string.IsNullOrEmpty(searchTerm))
                        {
                            cmd.Parameters.AddWithValue("@Term", "%" + searchTerm + "%");
                        }

                        using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                        {
                            DataTable table = new DataTable();
                            adapter.Fill(table);
                            dgvStock.DataSource = table;
                        }
                    }
                }

                FormatGridColumns();
            }
            catch (MySqlException ex)
            {
                MessageBox.Show("Database error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void FormatGridColumns()
        {
            HideColumn("StockID");
            HideColumn("CategoryID");
            HideColumn("KaratID");

            SetHeader("ItemCode", "Item Code");
            SetHeader("ItemName", "Item Name");
            SetHeader("CategoryName", "Category");
            SetHeader("KaratName", "Karat");
            SetHeader("MakingCharges", "Making Charges");
        }

        private void HideColumn(string columnName)
        {
            if (dgvStock.Columns.Contains(columnName))
            {
                dgvStock.Columns[columnName].Visible = false;
            }
        }

        private void SetHeader(string columnName, string headerText)
        {
            if (dgvStock.Columns.Contains(columnName))
            {
                dgvStock.Columns[columnName].HeaderText = headerText;
            }
        }

        private bool TryReadForm(out string itemCode, out string itemName, out int categoryId,
            out int karatId, out decimal weight, out decimal makingCharges, out int quantity)
        {
            itemCode = txtItemCode.Text.Trim();
            itemName = txtItemName.Text.Trim();
            categoryId = 0;
            karatId = 0;
            weight = 0;
            makingCharges = 0;
            quantity = 0;

            if (string.IsNullOrWhiteSpace(itemCode) || string.IsNullOrWhiteSpace(itemName))
            {
                MessageBox.Show("Item Code and Item Name are required.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            if (cboCategory.SelectedValue == null || cboKarat.SelectedValue == null)
            {
                MessageBox.Show("Please select a Category and a Karat.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            if (!decimal.TryParse(txtWeight.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out weight) ||
                !decimal.TryParse(txtMakingCharges.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out makingCharges) ||
                !int.TryParse(txtQuantity.Text.Trim(), out quantity))
            {
                MessageBox.Show("Please enter valid numeric values for Weight, Making Charges, and Quantity.",
                    "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            categoryId = Convert.ToInt32(cboCategory.SelectedValue);
            karatId = Convert.ToInt32(cboKarat.SelectedValue);
            return true;
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (!TryReadForm(out string itemCode, out string itemName, out int categoryId,
                out int karatId, out decimal weight, out decimal makingCharges, out int quantity))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "INSERT INTO stock (ItemCode, ItemName, CategoryID, KaratID, Weight, MakingCharges, Quantity) " +
                                   "VALUES (@ItemCode, @ItemName, @CategoryID, @KaratID, @Weight, @MakingCharges, @Quantity)";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@ItemCode", itemCode);
                        cmd.Parameters.AddWithValue("@ItemName", itemName);
                        cmd.Parameters.AddWithValue("@CategoryID", categoryId);
                        cmd.Parameters.AddWithValue("@KaratID", karatId);
                        cmd.Parameters.AddWithValue("@Weight", weight);
                        cmd.Parameters.AddWithValue("@MakingCharges", makingCharges);
                        cmd.Parameters.AddWithValue("@Quantity", quantity);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Item saved successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadStock(null);
            }
            catch (MySqlException ex)
            {
                if (ex.Number == 1062)
                {
                    MessageBox.Show("This Item Code already exists. Please use a different code.",
                        "Duplicate Item Code", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
                else
                {
                    MessageBox.Show("Database error: " + ex.Message, "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnUpdate_Click(object sender, EventArgs e)
        {
            if (_selectedStockId == 0)
            {
                MessageBox.Show("Please select an item from the list to update.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!TryReadForm(out string itemCode, out string itemName, out int categoryId,
                out int karatId, out decimal weight, out decimal makingCharges, out int quantity))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "UPDATE stock SET ItemCode = @ItemCode, ItemName = @ItemName, " +
                                   "CategoryID = @CategoryID, KaratID = @KaratID, Weight = @Weight, " +
                                   "MakingCharges = @MakingCharges, Quantity = @Quantity WHERE StockID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@ItemCode", itemCode);
                        cmd.Parameters.AddWithValue("@ItemName", itemName);
                        cmd.Parameters.AddWithValue("@CategoryID", categoryId);
                        cmd.Parameters.AddWithValue("@KaratID", karatId);
                        cmd.Parameters.AddWithValue("@Weight", weight);
                        cmd.Parameters.AddWithValue("@MakingCharges", makingCharges);
                        cmd.Parameters.AddWithValue("@Quantity", quantity);
                        cmd.Parameters.AddWithValue("@Id", _selectedStockId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Item updated successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadStock(null);
            }
            catch (MySqlException ex)
            {
                if (ex.Number == 1062)
                {
                    MessageBox.Show("This Item Code already exists. Please use a different code.",
                        "Duplicate Item Code", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
                else
                {
                    MessageBox.Show("Database error: " + ex.Message, "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (_selectedStockId == 0)
            {
                MessageBox.Show("Please select an item from the list to delete.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to delete this item?",
                "Confirm Delete",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (confirm != DialogResult.Yes)
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "DELETE FROM stock WHERE StockID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", _selectedStockId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Item deleted successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadStock(null);
            }
            catch (MySqlException ex)
            {
                MessageBox.Show("Database error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnSearch_Click(object sender, EventArgs e)
        {
            LoadStock(txtSearch.Text.Trim());
        }

        private void btnClear_Click(object sender, EventArgs e)
        {
            ClearFields();
            txtSearch.Clear();
            LoadStock(null);
        }

        private void ClearFields()
        {
            txtItemCode.Clear();
            txtItemName.Clear();
            txtWeight.Clear();
            txtMakingCharges.Clear();
            txtQuantity.Clear();
            cboCategory.SelectedIndex = cboCategory.Items.Count > 0 ? 0 : -1;
            cboKarat.SelectedIndex = cboKarat.Items.Count > 0 ? 0 : -1;
            _selectedStockId = 0;
            dgvStock.ClearSelection();
        }

        private void dgvStock_SelectionChanged(object sender, EventArgs e)
        {
            if (dgvStock.CurrentRow == null || dgvStock.CurrentRow.Cells["StockID"].Value == null)
            {
                return;
            }

            _selectedStockId = Convert.ToInt32(dgvStock.CurrentRow.Cells["StockID"].Value);
            txtItemCode.Text = dgvStock.CurrentRow.Cells["ItemCode"].Value?.ToString() ?? "";
            txtItemName.Text = dgvStock.CurrentRow.Cells["ItemName"].Value?.ToString() ?? "";
            txtWeight.Text = dgvStock.CurrentRow.Cells["Weight"].Value?.ToString() ?? "";
            txtMakingCharges.Text = dgvStock.CurrentRow.Cells["MakingCharges"].Value?.ToString() ?? "";
            txtQuantity.Text = dgvStock.CurrentRow.Cells["Quantity"].Value?.ToString() ?? "";

            object categoryId = dgvStock.CurrentRow.Cells["CategoryID"].Value;
            cboCategory.SelectedValue = categoryId is DBNull ? null : categoryId;

            object karatId = dgvStock.CurrentRow.Cells["KaratID"].Value;
            cboKarat.SelectedValue = karatId is DBNull ? null : karatId;
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
