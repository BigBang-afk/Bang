using System;
using System.Data;
using System.Globalization;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmRepair : Form
    {
        private int _selectedRepairId = 0;

        public frmRepair()
        {
            InitializeComponent();
        }

        private void frmRepair_Load(object sender, EventArgs e)
        {
            cboStatus.Items.Clear();
            cboStatus.Items.AddRange(new object[] { "Pending", "In Progress", "Completed", "Delivered", "Cancelled" });
            cboStatus.SelectedIndex = 0;
            dtpDeliveryDate.Value = DateTime.Now.AddDays(7);

            RefreshReceiptNumber();
            LoadRepairs(null);
        }

        private void RefreshReceiptNumber()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand("SELECT IFNULL(MAX(RepairID), 0) + 1 FROM repairs", conn))
                    {
                        int nextId = Convert.ToInt32(cmd.ExecuteScalar());
                        lblReceiptNumber.Text = "REP-" + nextId.ToString("D6");
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoadRepairs(string searchTerm)
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "SELECT RepairID, ReceiptNumber, CustomerName, CustomerPhone, ItemDescription, " +
                                   "Weight, EstimatedCost, AdvancePaid, Status, ReceivedDate, DeliveryDate, Notes " +
                                   "FROM repairs";

                    if (!string.IsNullOrEmpty(searchTerm))
                    {
                        query += " WHERE CustomerName LIKE @Term OR CustomerPhone LIKE @Term OR ReceiptNumber LIKE @Term";
                    }

                    query += " ORDER BY ReceivedDate DESC";

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
                            dgvRepairs.DataSource = table;
                        }
                    }
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

        private void FormatGridColumns()
        {
            HideColumn("RepairID");
            SetHeader("ReceiptNumber", "Receipt #");
            SetHeader("CustomerName", "Customer");
            SetHeader("CustomerPhone", "Phone");
            SetHeader("ItemDescription", "Item");
            SetHeader("EstimatedCost", "Est. Cost");
            SetHeader("AdvancePaid", "Advance");
            SetHeader("ReceivedDate", "Received");
            SetHeader("DeliveryDate", "Delivery Date");
        }

        private void HideColumn(string columnName)
        {
            if (dgvRepairs.Columns.Contains(columnName))
            {
                dgvRepairs.Columns[columnName].Visible = false;
            }
        }

        private void SetHeader(string columnName, string headerText)
        {
            if (dgvRepairs.Columns.Contains(columnName))
            {
                dgvRepairs.Columns[columnName].HeaderText = headerText;
            }
        }

        private bool TryReadForm(out string customerName, out string customerPhone, out string itemDescription,
            out decimal weight, out decimal estimatedCost, out decimal advancePaid)
        {
            customerName = txtCustomerName.Text.Trim();
            customerPhone = txtCustomerPhone.Text.Trim();
            itemDescription = txtItemDescription.Text.Trim();
            weight = 0;
            estimatedCost = 0;
            advancePaid = 0;

            if (string.IsNullOrWhiteSpace(customerName) || string.IsNullOrWhiteSpace(itemDescription))
            {
                MessageBox.Show("Customer Name and Item Description are required.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            string weightText = string.IsNullOrWhiteSpace(txtWeight.Text) ? "0" : txtWeight.Text.Trim();
            string costText = string.IsNullOrWhiteSpace(txtEstimatedCost.Text) ? "0" : txtEstimatedCost.Text.Trim();
            string advanceText = string.IsNullOrWhiteSpace(txtAdvancePaid.Text) ? "0" : txtAdvancePaid.Text.Trim();

            if (!decimal.TryParse(weightText, NumberStyles.Number, CultureInfo.InvariantCulture, out weight) ||
                !decimal.TryParse(costText, NumberStyles.Number, CultureInfo.InvariantCulture, out estimatedCost) ||
                !decimal.TryParse(advanceText, NumberStyles.Number, CultureInfo.InvariantCulture, out advancePaid))
            {
                MessageBox.Show("Please enter valid numeric values for Weight, Estimated Cost, and Advance Paid.",
                    "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            return true;
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (!TryReadForm(out string customerName, out string customerPhone, out string itemDescription,
                out decimal weight, out decimal estimatedCost, out decimal advancePaid))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    int repairId;
                    using (MySqlCommand cmd = new MySqlCommand(
                        "INSERT INTO repairs (ReceiptNumber, CustomerName, CustomerPhone, ItemDescription, Weight, " +
                        "EstimatedCost, AdvancePaid, Status, DeliveryDate, Notes) VALUES " +
                        "('PENDING', @CustomerName, @CustomerPhone, @ItemDescription, @Weight, @EstimatedCost, " +
                        "@AdvancePaid, @Status, @DeliveryDate, @Notes)", conn))
                    {
                        cmd.Parameters.AddWithValue("@CustomerName", customerName);
                        cmd.Parameters.AddWithValue("@CustomerPhone", customerPhone);
                        cmd.Parameters.AddWithValue("@ItemDescription", itemDescription);
                        cmd.Parameters.AddWithValue("@Weight", weight);
                        cmd.Parameters.AddWithValue("@EstimatedCost", estimatedCost);
                        cmd.Parameters.AddWithValue("@AdvancePaid", advancePaid);
                        cmd.Parameters.AddWithValue("@Status", cboStatus.Text);
                        cmd.Parameters.AddWithValue("@DeliveryDate", dtpDeliveryDate.Value.Date);
                        cmd.Parameters.AddWithValue("@Notes", "");
                        cmd.ExecuteNonQuery();
                        repairId = (int)cmd.LastInsertedId;
                    }

                    string receiptNumber = "REP-" + repairId.ToString("D6");

                    using (MySqlCommand cmd = new MySqlCommand(
                        "UPDATE repairs SET ReceiptNumber = @ReceiptNumber WHERE RepairID = @Id", conn))
                    {
                        cmd.Parameters.AddWithValue("@ReceiptNumber", receiptNumber);
                        cmd.Parameters.AddWithValue("@Id", repairId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Repair ticket saved successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadRepairs(null);
                RefreshReceiptNumber();
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
            if (_selectedRepairId == 0)
            {
                MessageBox.Show("Please select a repair ticket from the list to update.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!TryReadForm(out string customerName, out string customerPhone, out string itemDescription,
                out decimal weight, out decimal estimatedCost, out decimal advancePaid))
            {
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "UPDATE repairs SET CustomerName = @CustomerName, CustomerPhone = @CustomerPhone, " +
                                   "ItemDescription = @ItemDescription, Weight = @Weight, EstimatedCost = @EstimatedCost, " +
                                   "AdvancePaid = @AdvancePaid, Status = @Status, DeliveryDate = @DeliveryDate " +
                                   "WHERE RepairID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@CustomerName", customerName);
                        cmd.Parameters.AddWithValue("@CustomerPhone", customerPhone);
                        cmd.Parameters.AddWithValue("@ItemDescription", itemDescription);
                        cmd.Parameters.AddWithValue("@Weight", weight);
                        cmd.Parameters.AddWithValue("@EstimatedCost", estimatedCost);
                        cmd.Parameters.AddWithValue("@AdvancePaid", advancePaid);
                        cmd.Parameters.AddWithValue("@Status", cboStatus.Text);
                        cmd.Parameters.AddWithValue("@DeliveryDate", dtpDeliveryDate.Value.Date);
                        cmd.Parameters.AddWithValue("@Id", _selectedRepairId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Repair ticket updated successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadRepairs(null);
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
            if (_selectedRepairId == 0)
            {
                MessageBox.Show("Please select a repair ticket from the list to delete.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to delete this repair ticket?",
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
                    using (MySqlCommand cmd = new MySqlCommand("DELETE FROM repairs WHERE RepairID = @Id", conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", _selectedRepairId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Repair ticket deleted successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadRepairs(null);
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
            LoadRepairs(txtSearch.Text.Trim());
        }

        private void btnClear_Click(object sender, EventArgs e)
        {
            ClearFields();
            txtSearch.Clear();
            LoadRepairs(null);
        }

        private void ClearFields()
        {
            txtCustomerName.Clear();
            txtCustomerPhone.Clear();
            txtItemDescription.Clear();
            txtWeight.Clear();
            txtEstimatedCost.Clear();
            txtAdvancePaid.Clear();
            cboStatus.SelectedIndex = 0;
            dtpDeliveryDate.Value = DateTime.Now.AddDays(7);
            _selectedRepairId = 0;
            dgvRepairs.ClearSelection();
        }

        private void dgvRepairs_SelectionChanged(object sender, EventArgs e)
        {
            if (dgvRepairs.CurrentRow == null || dgvRepairs.CurrentRow.Cells["RepairID"].Value == null)
            {
                return;
            }

            _selectedRepairId = Convert.ToInt32(dgvRepairs.CurrentRow.Cells["RepairID"].Value);
            txtCustomerName.Text = dgvRepairs.CurrentRow.Cells["CustomerName"].Value?.ToString() ?? "";
            txtCustomerPhone.Text = dgvRepairs.CurrentRow.Cells["CustomerPhone"].Value?.ToString() ?? "";
            txtItemDescription.Text = dgvRepairs.CurrentRow.Cells["ItemDescription"].Value?.ToString() ?? "";
            txtWeight.Text = dgvRepairs.CurrentRow.Cells["Weight"].Value?.ToString() ?? "";
            txtEstimatedCost.Text = dgvRepairs.CurrentRow.Cells["EstimatedCost"].Value?.ToString() ?? "";
            txtAdvancePaid.Text = dgvRepairs.CurrentRow.Cells["AdvancePaid"].Value?.ToString() ?? "";

            string status = dgvRepairs.CurrentRow.Cells["Status"].Value?.ToString() ?? "Pending";
            int statusIndex = cboStatus.Items.IndexOf(status);
            cboStatus.SelectedIndex = statusIndex >= 0 ? statusIndex : 0;

            object deliveryDate = dgvRepairs.CurrentRow.Cells["DeliveryDate"].Value;
            if (deliveryDate != null && deliveryDate != DBNull.Value)
            {
                dtpDeliveryDate.Value = Convert.ToDateTime(deliveryDate);
            }
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
