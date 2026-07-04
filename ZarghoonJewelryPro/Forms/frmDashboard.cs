using System;
using System.Windows.Forms;
using ZarghoonJewelryPro.Data;

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

            if (!BackupTracker.WasBackedUpToday())
            {
                MessageBox.Show(
                    "You haven't backed up your database today.\n\n" +
                    "It's recommended to back up daily — go to Backup & Restore from the menu.",
                    "Daily Backup Reminder", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
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

        private void btnSales_Click(object sender, EventArgs e)
        {
            using (frmSales salesForm = new frmSales())
            {
                salesForm.ShowDialog();
            }
        }

        private void btnRepairs_Click(object sender, EventArgs e)
        {
            using (frmRepair repairForm = new frmRepair())
            {
                repairForm.ShowDialog();
            }
        }

        private void btnCashInOut_Click(object sender, EventArgs e)
        {
            using (frmCashInOut cashForm = new frmCashInOut())
            {
                cashForm.ShowDialog();
            }
        }

        private void btnReports_Click(object sender, EventArgs e)
        {
            using (frmReports reportsForm = new frmReports())
            {
                reportsForm.ShowDialog();
            }
        }

        private void btnSettings_Click(object sender, EventArgs e) => ShowNotBuiltYet("Settings", 15);

        private void btnBackup_Click(object sender, EventArgs e)
        {
            using (frmBackup backupForm = new frmBackup())
            {
                backupForm.ShowDialog();
            }
        }

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
