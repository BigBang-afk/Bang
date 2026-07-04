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
                                string fullName = reader["FullName"].ToString();
                                string role = reader["Role"].ToString();

                                string enteredHash = PasswordHelper.HashPassword(password);

                                if (enteredHash == storedHash)
                                {
                                    MessageBox.Show(
                                        $"Welcome, {fullName} ({role})!\n\nModule 2 (Dashboard) will open here next.",
                                        "Login Successful",
                                        MessageBoxButtons.OK,
                                        MessageBoxIcon.Information);

                                    txtUsername.Clear();
                                    txtPassword.Clear();
                                }
                                else
                                {
                                    lblMessage.Text = "Invalid username or password.";
                                }
                            }
                            else
                            {
                                lblMessage.Text = "Invalid username or password.";
                            }
                        }
                    }
                }
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

        private void btnExit_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }
    }
}
