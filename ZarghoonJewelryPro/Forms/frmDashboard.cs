using System;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmDashboard : Form
    {
        private readonly string _fullName;
        private readonly string _role;

        public frmDashboard(string fullName, string role)
        {
            InitializeComponent();
            _fullName = fullName;
            _role = role;
        }

        private void frmDashboard_Load(object sender, EventArgs e)
        {
            lblWelcomeUser.Text = $"Logged in as: {_fullName} ({_role})";
            lblDateTime.Text = DateTime.Now.ToString("dddd, dd MMMM yyyy   hh:mm:ss tt");
            timerClock.Start();
        }

        private void timerClock_Tick(object sender, EventArgs e)
        {
            lblDateTime.Text = DateTime.Now.ToString("dddd, dd MMMM yyyy   hh:mm:ss tt");
        }

        private void ShowNotBuiltYet(string moduleName, int moduleNumber)
        {
            MessageBox.Show(
                $"The {moduleName} module hasn't been built yet.\n\nIt's coming in Module {moduleNumber} of the roadmap.",
                "Coming Soon",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }

        private void btnCustomers_Click(object sender, EventArgs e)
        {
            using (frmCustomer customerForm = new frmCustomer())
            {
                customerForm.ShowDialog();
            }
        }

        private void btnStock_Click(object sender, EventArgs e)
        {
            using (frmStock stockForm = new frmStock())
            {
                stockForm.ShowDialog();
            }
        }

        private void btnSales_Click(object sender, EventArgs e) => ShowNotBuiltYet("Sales Billing", 5);

        private void btnRepairs_Click(object sender, EventArgs e) => ShowNotBuiltYet("Repairs", 6);

        private void btnCashInOut_Click(object sender, EventArgs e) => ShowNotBuiltYet("Cash In / Out", 7);

        private void btnReports_Click(object sender, EventArgs e) => ShowNotBuiltYet("Reports", 8);

        private void btnSettings_Click(object sender, EventArgs e) => ShowNotBuiltYet("Settings", 15);

        private void btnBackup_Click(object sender, EventArgs e) => ShowNotBuiltYet("Backup & Restore", 10);

        private void btnLogout_Click(object sender, EventArgs e)
        {
            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to logout?",
                "Confirm Logout",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (confirm == DialogResult.Yes)
            {
                timerClock.Stop();
                this.Close();
            }
        }
    }
}
