using System;
using System.Data;
using System.Globalization;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmCashInOut : Form
    {
        private int _selectedTransactionId = 0;

        private static readonly string[] SuggestedCategories =
        {
            "Sales Income", "Repair Advance", "Expense", "Rent", "Utilities",
            "Salary", "Owner Withdrawal", "Supplier Payment", "Other"
        };

        public frmCashInOut()
        {
            InitializeComponent();
        }

        private void frmCashInOut_Load(object sender, EventArgs e)
        {
            cboType.Items.Clear();
            cboType.Items.AddRange(new object[] { "In", "Out" });
            cboType.SelectedIndex = 0;

            cboCategory.Items.Clear();
            cboCategory.Items.AddRange(SuggestedCategories);

            LoadTransactions(null);
        }

        private void LoadTransactions(string searchTerm)
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "SELECT TransactionID, TransactionType, Category, Amount, Description, TransactionDate " +
                                   "FROM cash_transactions";

                    if (!string.IsNullOrEmpty(searchTerm))
                    {
                        query += " WHERE Category LIKE @Term OR Description LIKE @Term";
                    }

                    query += " ORDER BY TransactionDate DESC";

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
                            dgvCashTransactions.DataSource = table;
                        }
                    }

                    RefreshTotals(conn);
                }

                FormatGridColumns();
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RefreshTotals(MySqlConnection conn)
        {
            decimal totalIn = 0;
            decimal totalOut = 0;

            using (MySqlCommand cmd = new MySqlCommand(
                "SELECT TransactionType, SUM(Amount) FROM cash_transactions GROUP BY TransactionType", conn))
            using (MySqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string type = reader.GetString(0);
                    decimal amount = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1);
                    if (type == "In")
                    {
                        totalIn = amount;
                    }
                    else if (type == "Out")
                    {
                        totalOut = amount;
                    }
                }
            }

            lblTotalIn.Text = totalIn.ToString("N2", CultureInfo.InvariantCulture);
            lblTotalOut.Text = totalOut.ToString("N2", CultureInfo.InvariantCulture);
            lblNetBalance.Text = (totalIn - totalOut).ToString("N2", CultureInfo.InvariantCulture);
        }

        private void FormatGridColumns()
        {
            if (dgvCashTransactions.Columns.Contains("TransactionID"))
            {
                dgvCashTransactions.Columns["TransactionID"].Visible = false;
            }
            SetHeader("TransactionType", "Type");
            SetHeader("TransactionDate", "Date");
        }

        private void SetHeader(string columnName, string headerText)
        {
            if (dgvCashTransactions.Columns.Contains(columnName))
            {
                dgvCashTransactions.Columns[columnName].HeaderText = headerText;
            }
        }

        private bool TryReadForm(out string category, out string description, out decimal amount)
        {
            category = cboCategory.Text.Trim();
            description = txtDescription.Text.Trim();
            amount = 0;

            if (!decimal.TryParse(txtAmount.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out amount) || amount <= 0)
            {
                MessageBox.Show("Please enter a valid Amount greater than zero.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            return true;
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (!TryReadForm(out string category, out string description, out decimal amount))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "INSERT INTO cash_transactions (TransactionType, Category, Amount, Description) " +
                                   "VALUES (@Type, @Category, @Amount, @Description)";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Type", cboType.Text);
                        cmd.Parameters.AddWithValue("@Category", category);
                        cmd.Parameters.AddWithValue("@Amount", amount);
                        cmd.Parameters.AddWithValue("@Description", description);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Transaction saved successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadTransactions(null);
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnUpdate_Click(object sender, EventArgs e)
        {
            if (_selectedTransactionId == 0)
            {
                MessageBox.Show("Please select a transaction from the list to update.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!TryReadForm(out string category, out string description, out decimal amount))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "UPDATE cash_transactions SET TransactionType = @Type, Category = @Category, " +
                                   "Amount = @Amount, Description = @Description WHERE TransactionID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Type", cboType.Text);
                        cmd.Parameters.AddWithValue("@Category", category);
                        cmd.Parameters.AddWithValue("@Amount", amount);
                        cmd.Parameters.AddWithValue("@Description", description);
                        cmd.Parameters.AddWithValue("@Id", _selectedTransactionId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Transaction updated successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadTransactions(null);
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (_selectedTransactionId == 0)
            {
                MessageBox.Show("Please select a transaction from the list to delete.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to delete this transaction?",
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
                    using (MySqlCommand cmd = new MySqlCommand(
                        "DELETE FROM cash_transactions WHERE TransactionID = @Id", conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", _selectedTransactionId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Transaction deleted successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadTransactions(null);
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
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
            LoadTransactions(txtSearch.Text.Trim());
        }

        private void btnClear_Click(object sender, EventArgs e)
        {
            ClearFields();
            txtSearch.Clear();
            LoadTransactions(null);
        }

        private void ClearFields()
        {
            cboType.SelectedIndex = 0;
            cboCategory.SelectedIndex = -1;
            cboCategory.Text = "";
            txtAmount.Clear();
            txtDescription.Clear();
            _selectedTransactionId = 0;
            dgvCashTransactions.ClearSelection();
        }

        private void dgvCashTransactions_SelectionChanged(object sender, EventArgs e)
        {
            if (dgvCashTransactions.CurrentRow == null || dgvCashTransactions.CurrentRow.Cells["TransactionID"].Value == null)
            {
                return;
            }

            _selectedTransactionId = Convert.ToInt32(dgvCashTransactions.CurrentRow.Cells["TransactionID"].Value);

            string type = dgvCashTransactions.CurrentRow.Cells["TransactionType"].Value?.ToString() ?? "In";
            int typeIndex = cboType.Items.IndexOf(type);
            cboType.SelectedIndex = typeIndex >= 0 ? typeIndex : 0;

            cboCategory.Text = dgvCashTransactions.CurrentRow.Cells["Category"].Value?.ToString() ?? "";
            txtAmount.Text = dgvCashTransactions.CurrentRow.Cells["Amount"].Value?.ToString() ?? "";
            txtDescription.Text = dgvCashTransactions.CurrentRow.Cells["Description"].Value?.ToString() ?? "";
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
