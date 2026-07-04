using System;
using System.Data;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmCustomer : Form
    {
        private int _selectedCustomerId = 0;

        public frmCustomer()
        {
            InitializeComponent();
        }

        private void frmCustomer_Load(object sender, EventArgs e)
        {
            LoadCustomers(null);
        }

        private void LoadCustomers(string searchTerm)
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "SELECT CustomerID, CustomerName, PhoneNumber, Address, Email " +
                                   "FROM customers";

                    if (!string.IsNullOrEmpty(searchTerm))
                    {
                        query += " WHERE CustomerName LIKE @Term OR PhoneNumber LIKE @Term";
                    }

                    query += " ORDER BY CustomerName";

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
                            dgvCustomers.DataSource = table;
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
            if (dgvCustomers.Columns.Contains("CustomerID"))
            {
                dgvCustomers.Columns["CustomerID"].Visible = false;
            }
            if (dgvCustomers.Columns.Contains("CustomerName"))
            {
                dgvCustomers.Columns["CustomerName"].HeaderText = "Customer Name";
            }
            if (dgvCustomers.Columns.Contains("PhoneNumber"))
            {
                dgvCustomers.Columns["PhoneNumber"].HeaderText = "Phone";
            }
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtCustomerName.Text))
            {
                MessageBox.Show("Customer name is required.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "INSERT INTO customers (CustomerName, PhoneNumber, Address, Email) " +
                                   "VALUES (@Name, @Phone, @Address, @Email)";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Name", txtCustomerName.Text.Trim());
                        cmd.Parameters.AddWithValue("@Phone", txtPhone.Text.Trim());
                        cmd.Parameters.AddWithValue("@Address", txtAddress.Text.Trim());
                        cmd.Parameters.AddWithValue("@Email", txtEmail.Text.Trim());
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Customer saved successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadCustomers(null);
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

        private void btnUpdate_Click(object sender, EventArgs e)
        {
            if (_selectedCustomerId == 0)
            {
                MessageBox.Show("Please select a customer from the list to update.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(txtCustomerName.Text))
            {
                MessageBox.Show("Customer name is required.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "UPDATE customers SET CustomerName = @Name, PhoneNumber = @Phone, " +
                                   "Address = @Address, Email = @Email WHERE CustomerID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Name", txtCustomerName.Text.Trim());
                        cmd.Parameters.AddWithValue("@Phone", txtPhone.Text.Trim());
                        cmd.Parameters.AddWithValue("@Address", txtAddress.Text.Trim());
                        cmd.Parameters.AddWithValue("@Email", txtEmail.Text.Trim());
                        cmd.Parameters.AddWithValue("@Id", _selectedCustomerId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Customer updated successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadCustomers(null);
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

        private void btnDelete_Click(object sender, EventArgs e)
        {
            if (_selectedCustomerId == 0)
            {
                MessageBox.Show("Please select a customer from the list to delete.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to delete this customer?",
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

                    string query = "DELETE FROM customers WHERE CustomerID = @Id";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Id", _selectedCustomerId);
                        cmd.ExecuteNonQuery();
                    }
                }

                MessageBox.Show("Customer deleted successfully.", "Success",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);

                ClearFields();
                LoadCustomers(null);
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
            LoadCustomers(txtSearch.Text.Trim());
        }

        private void btnClear_Click(object sender, EventArgs e)
        {
            ClearFields();
            txtSearch.Clear();
            LoadCustomers(null);
        }

        private void ClearFields()
        {
            txtCustomerName.Clear();
            txtPhone.Clear();
            txtAddress.Clear();
            txtEmail.Clear();
            _selectedCustomerId = 0;
            dgvCustomers.ClearSelection();
        }

        private void dgvCustomers_SelectionChanged(object sender, EventArgs e)
        {
            if (dgvCustomers.CurrentRow == null || dgvCustomers.CurrentRow.Cells["CustomerID"].Value == null)
            {
                return;
            }

            _selectedCustomerId = Convert.ToInt32(dgvCustomers.CurrentRow.Cells["CustomerID"].Value);
            txtCustomerName.Text = dgvCustomers.CurrentRow.Cells["CustomerName"].Value?.ToString() ?? "";
            txtPhone.Text = dgvCustomers.CurrentRow.Cells["PhoneNumber"].Value?.ToString() ?? "";
            txtAddress.Text = dgvCustomers.CurrentRow.Cells["Address"].Value?.ToString() ?? "";
            txtEmail.Text = dgvCustomers.CurrentRow.Cells["Email"].Value?.ToString() ?? "";
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
