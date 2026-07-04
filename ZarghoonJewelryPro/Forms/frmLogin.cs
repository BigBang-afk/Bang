using System;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmLogin : Form
    {
        public frmLogin()
        {
            InitializeComponent();
        }

        private void btnLogin_Click(object sender, EventArgs e)
        {
            lblMessage.Text = "";

            string username = txtUsername.Text.Trim();
            string password = txtPassword.Text;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                lblMessage.Text = "Please enter both username and password.";
                return;
            }

            bool loginOk = false;
            bool hadError = false;
            string fullName = "";
            string role = "";

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    string query = "SELECT FullName, Role, PasswordHash FROM users " +
                                   "WHERE Username = @Username AND IsActive = 1";

                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    {
                        cmd.Parameters.AddWithValue("@Username", username);

                        using (MySqlDataReader reader = cmd.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                string storedHash = reader["PasswordHash"].ToString();
                                fullName = reader["FullName"].ToString();
                                role = reader["Role"].ToString();

                                string enteredHash = PasswordHelper.HashPassword(password);
                                loginOk = (enteredHash == storedHash);
                            }
                        }
                    }
                }
            }
            catch (MySqlException ex)
            {
                hadError = true;
                MessageBox.Show("Database error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                hadError = true;
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            if (hadError)
            {
                return;
            }

            if (loginOk)
            {
                txtUsername.Clear();
                txtPassword.Clear();

                this.Hide();
                using (frmDashboard dashboard = new frmDashboard(fullName, role))
                {
                    dashboard.ShowDialog();
                }
                this.Show();
            }
            else
            {
                lblMessage.Text = "Invalid username or password.";
            }
        }

        private void btnExit_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }
    }
}
