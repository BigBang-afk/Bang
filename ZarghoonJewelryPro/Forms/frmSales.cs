using System;
using System.Data;
using System.Drawing;
using System.Globalization;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmSales : Form
    {
        private DataTable _cartTable;
        private decimal _cartTotal = 0m;

        public frmSales()
        {
            InitializeComponent();
        }

        private void frmSales_Load(object sender, EventArgs e)
        {
            _cartTable = new DataTable();
            _cartTable.Columns.Add("StockID", typeof(int));
            _cartTable.Columns.Add("ItemCode", typeof(string));
            _cartTable.Columns.Add("ItemName", typeof(string));
            _cartTable.Columns.Add("Karat", typeof(string));
            _cartTable.Columns.Add("Weight", typeof(decimal));
            _cartTable.Columns.Add("Quantity", typeof(int));
            _cartTable.Columns.Add("RatePerGram", typeof(decimal));
            _cartTable.Columns.Add("MakingCharges", typeof(decimal));
            _cartTable.Columns.Add("LineTotal", typeof(decimal));

            dgvSaleItems.DataSource = _cartTable;
            FormatCartColumns();

            lblSaleDate.Text = DateTime.Now.ToString("dd MMM yyyy  hh:mm tt");

            LoadCustomers();
            LoadItems();
            RefreshInvoiceNumber();
        }

        private void FormatCartColumns()
        {
            if (dgvSaleItems.Columns.Contains("StockID"))
            {
                dgvSaleItems.Columns["StockID"].Visible = false;
            }
            SetCartHeader("ItemCode", "Item Code");
            SetCartHeader("ItemName", "Item Name");
            SetCartHeader("RatePerGram", "Rate/Gram");
            SetCartHeader("MakingCharges", "Making Charges");
            SetCartHeader("LineTotal", "Line Total");
        }

        private void SetCartHeader(string columnName, string headerText)
        {
            if (dgvSaleItems.Columns.Contains(columnName))
            {
                dgvSaleItems.Columns[columnName].HeaderText = headerText;
            }
        }

        private void LoadCustomers()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT CustomerID, CustomerName FROM customers ORDER BY CustomerName";
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        DataTable table = new DataTable();
                        adapter.Fill(table);

                        DataRow walkIn = table.NewRow();
                        walkIn["CustomerID"] = 0;
                        walkIn["CustomerName"] = "Walk-in Customer";
                        table.Rows.InsertAt(walkIn, 0);

                        cboCustomer.DataSource = table;
                        cboCustomer.DisplayMember = "CustomerName";
                        cboCustomer.ValueMember = "CustomerID";
                        cboCustomer.SelectedIndex = 0;
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoadItems()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    string query =
                        "SELECT s.StockID, s.ItemCode, s.ItemName, k.KaratName, s.Weight, s.MakingCharges, s.Quantity " +
                        "FROM stock s JOIN karats k ON s.KaratID = k.KaratID " +
                        "WHERE s.Quantity > 0 ORDER BY s.ItemName";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        DataTable table = new DataTable();
                        adapter.Fill(table);
                        table.Columns.Add("Display", typeof(string), "ItemCode + ' - ' + ItemName");

                        cboItem.DataSource = table;
                        cboItem.DisplayMember = "Display";
                        cboItem.ValueMember = "StockID";
                        cboItem.SelectedIndex = -1;
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RefreshInvoiceNumber()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    using (MySqlCommand cmd = new MySqlCommand("SELECT IFNULL(MAX(SaleID), 0) + 1 FROM sales", conn))
                    {
                        int nextId = Convert.ToInt32(cmd.ExecuteScalar());
                        lblInvoiceNumber.Text = "INV-" + nextId.ToString("D6");
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void cboItem_SelectedIndexChanged(object sender, EventArgs e)
        {
            DataRowView row = cboItem.SelectedItem as DataRowView;
            if (row == null)
            {
                return;
            }

            txtKarat.Text = row["KaratName"].ToString();
            txtWeight.Text = Convert.ToDecimal(row["Weight"]).ToString("0.000", CultureInfo.InvariantCulture);
            txtMakingCharges.Text = Convert.ToDecimal(row["MakingCharges"]).ToString("0.00", CultureInfo.InvariantCulture);
            txtQuantity.Text = "1";
        }

        private void btnAddItem_Click(object sender, EventArgs e)
        {
            DataRowView selectedRow = cboItem.SelectedItem as DataRowView;
            if (selectedRow == null)
            {
                MessageBox.Show("Please select an item.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!decimal.TryParse(txtRatePerGram.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out decimal rate) || rate <= 0 ||
                !decimal.TryParse(txtMakingCharges.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out decimal makingCharges) || makingCharges < 0 ||
                !int.TryParse(txtQuantity.Text.Trim(), out int quantity) || quantity <= 0)
            {
                MessageBox.Show("Please enter a valid Rate/Gram, Making Charges, and Quantity.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            int availableQty = Convert.ToInt32(selectedRow["Quantity"]);
            if (quantity > availableQty)
            {
                MessageBox.Show($"Only {availableQty} in stock for this item.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            decimal weight = Convert.ToDecimal(selectedRow["Weight"]);
            decimal lineTotal = (weight * rate + makingCharges) * quantity;

            DataRow newRow = _cartTable.NewRow();
            newRow["StockID"] = Convert.ToInt32(selectedRow["StockID"]);
            newRow["ItemCode"] = selectedRow["ItemCode"].ToString();
            newRow["ItemName"] = selectedRow["ItemName"].ToString();
            newRow["Karat"] = selectedRow["KaratName"].ToString();
            newRow["Weight"] = weight;
            newRow["Quantity"] = quantity;
            newRow["RatePerGram"] = rate;
            newRow["MakingCharges"] = makingCharges;
            newRow["LineTotal"] = lineTotal;
            _cartTable.Rows.Add(newRow);

            RecalculateTotals();

            cboItem.SelectedIndex = -1;
            txtKarat.Clear();
            txtWeight.Clear();
            txtRatePerGram.Clear();
            txtMakingCharges.Clear();
            txtQuantity.Text = "1";
        }

        private void btnRemoveItem_Click(object sender, EventArgs e)
        {
            if (dgvSaleItems.CurrentRow == null)
            {
                MessageBox.Show("Please select an item in the invoice list to remove.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (dgvSaleItems.CurrentRow.DataBoundItem is DataRowView rowView)
            {
                rowView.Row.Delete();
                _cartTable.AcceptChanges();
                RecalculateTotals();
            }
        }

        private void RecalculateTotals()
        {
            _cartTotal = 0m;
            foreach (DataRow row in _cartTable.Rows)
            {
                _cartTotal += Convert.ToDecimal(row["LineTotal"]);
            }
            lblTotalAmount.Text = _cartTotal.ToString("N2", CultureInfo.InvariantCulture);
            RecalculateBalance();
        }

        private void txtReceivedAmount_TextChanged(object sender, EventArgs e)
        {
            RecalculateBalance();
        }

        private void RecalculateBalance()
        {
            decimal.TryParse(txtReceivedAmount.Text.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out decimal received);
            decimal balance = _cartTotal - received;

            if (balance > 0)
            {
                lblBalanceAmount.Text = "Due: " + balance.ToString("N2", CultureInfo.InvariantCulture);
                lblBalanceAmount.ForeColor = Color.Red;
            }
            else if (balance < 0)
            {
                lblBalanceAmount.Text = "Change: " + Math.Abs(balance).ToString("N2", CultureInfo.InvariantCulture);
                lblBalanceAmount.ForeColor = Color.Green;
            }
            else
            {
                lblBalanceAmount.Text = "0.00";
                lblBalanceAmount.ForeColor = Color.Black;
            }
        }

        private void btnSaveSale_Click(object sender, EventArgs e)
        {
            if (_cartTable.Rows.Count == 0)
            {
                MessageBox.Show("Please add at least one item to the invoice.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string receivedText = string.IsNullOrWhiteSpace(txtReceivedAmount.Text) ? "0" : txtReceivedAmount.Text.Trim();
            if (!decimal.TryParse(receivedText, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal received) || received < 0)
            {
                MessageBox.Show("Please enter a valid received amount.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            int? customerId = null;
            if (cboCustomer.SelectedValue != null)
            {
                int selectedCustomerId = Convert.ToInt32(cboCustomer.SelectedValue);
                if (selectedCustomerId != 0)
                {
                    customerId = selectedCustomerId;
                }
            }

            decimal balance = _cartTotal - received;

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    using (MySqlTransaction transaction = conn.BeginTransaction())
                    {
                        try
                        {
                            int saleId;
                            using (MySqlCommand cmd = new MySqlCommand(
                                "INSERT INTO sales (InvoiceNumber, CustomerID, TotalAmount, ReceivedAmount, BalanceAmount) " +
                                "VALUES ('PENDING', @CustomerID, @Total, @Received, @Balance)", conn, transaction))
                            {
                                cmd.Parameters.AddWithValue("@CustomerID", (object)customerId ?? DBNull.Value);
                                cmd.Parameters.AddWithValue("@Total", _cartTotal);
                                cmd.Parameters.AddWithValue("@Received", received);
                                cmd.Parameters.AddWithValue("@Balance", balance);
                                cmd.ExecuteNonQuery();
                                saleId = (int)cmd.LastInsertedId;
                            }

                            string invoiceNumber = "INV-" + saleId.ToString("D6");

                            using (MySqlCommand cmd = new MySqlCommand(
                                "UPDATE sales SET InvoiceNumber = @InvoiceNumber WHERE SaleID = @SaleID", conn, transaction))
                            {
                                cmd.Parameters.AddWithValue("@InvoiceNumber", invoiceNumber);
                                cmd.Parameters.AddWithValue("@SaleID", saleId);
                                cmd.ExecuteNonQuery();
                            }

                            foreach (DataRow row in _cartTable.Rows)
                            {
                                using (MySqlCommand cmd = new MySqlCommand(
                                    "INSERT INTO sales_items (SaleID, StockID, ItemName, Karat, Weight, Quantity, RatePerGram, MakingCharges, LineTotal) " +
                                    "VALUES (@SaleID, @StockID, @ItemName, @Karat, @Weight, @Quantity, @RatePerGram, @MakingCharges, @LineTotal)",
                                    conn, transaction))
                                {
                                    cmd.Parameters.AddWithValue("@SaleID", saleId);
                                    cmd.Parameters.AddWithValue("@StockID", row["StockID"]);
                                    cmd.Parameters.AddWithValue("@ItemName", row["ItemName"]);
                                    cmd.Parameters.AddWithValue("@Karat", row["Karat"]);
                                    cmd.Parameters.AddWithValue("@Weight", row["Weight"]);
                                    cmd.Parameters.AddWithValue("@Quantity", row["Quantity"]);
                                    cmd.Parameters.AddWithValue("@RatePerGram", row["RatePerGram"]);
                                    cmd.Parameters.AddWithValue("@MakingCharges", row["MakingCharges"]);
                                    cmd.Parameters.AddWithValue("@LineTotal", row["LineTotal"]);
                                    cmd.ExecuteNonQuery();
                                }

                                using (MySqlCommand cmd = new MySqlCommand(
                                    "UPDATE stock SET Quantity = Quantity - @Qty WHERE StockID = @StockID", conn, transaction))
                                {
                                    cmd.Parameters.AddWithValue("@Qty", row["Quantity"]);
                                    cmd.Parameters.AddWithValue("@StockID", row["StockID"]);
                                    cmd.ExecuteNonQuery();
                                }
                            }

                            transaction.Commit();

                            MessageBox.Show(
                                $"Sale saved successfully.\n\nInvoice: {invoiceNumber}\n" +
                                $"Total: {_cartTotal:N2}\nReceived: {received:N2}\nBalance: {balance:N2}",
                                "Sale Saved", MessageBoxButtons.OK, MessageBoxIcon.Information);

                            ClearSaleForm();
                            LoadItems();
                            RefreshInvoiceNumber();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
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

        private void ClearSaleForm()
        {
            _cartTable.Clear();
            RecalculateTotals();

            txtReceivedAmount.Clear();
            cboCustomer.SelectedIndex = cboCustomer.Items.Count > 0 ? 0 : -1;
            cboItem.SelectedIndex = -1;
            txtKarat.Clear();
            txtWeight.Clear();
            txtRatePerGram.Clear();
            txtMakingCharges.Clear();
            txtQuantity.Text = "1";

            lblSaleDate.Text = DateTime.Now.ToString("dd MMM yyyy  hh:mm tt");
        }

        private void btnClear_Click(object sender, EventArgs e)
        {
            ClearSaleForm();
        }

        private void btnPrint_Click(object sender, EventArgs e)
        {
            MessageBox.Show("Receipt printing will be added in Module 9.", "Coming Soon",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
