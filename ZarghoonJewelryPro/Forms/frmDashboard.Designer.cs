using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmDashboard
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private Panel pnlHeader;
        private Label lblShopName;
        private Label lblWelcomeUser;
        private Label lblDateTime;
        private Panel pnlMenu;
        private Button btnCustomers;
        private Button btnStock;
        private Button btnSales;
        private Button btnRepairs;
        private Button btnCashInOut;
        private Button btnReports;
        private Button btnSettings;
        private Button btnBackup;
        private Panel pnlFooter;
        private Button btnLogout;
        private Timer timerClock;

        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.pnlHeader = new Panel();
            this.lblShopName = new Label();
            this.lblWelcomeUser = new Label();
            this.lblDateTime = new Label();
            this.pnlMenu = new Panel();
            this.btnCustomers = new Button();
            this.btnStock = new Button();
            this.btnSales = new Button();
            this.btnRepairs = new Button();
            this.btnCashInOut = new Button();
            this.btnReports = new Button();
            this.btnSettings = new Button();
            this.btnBackup = new Button();
            this.pnlFooter = new Panel();
            this.btnLogout = new Button();
            this.timerClock = new Timer(this.components);
            this.pnlHeader.SuspendLayout();
            this.pnlMenu.SuspendLayout();
            this.pnlFooter.SuspendLayout();
            this.SuspendLayout();
            //
            // pnlHeader
            //
            this.pnlHeader.BackColor = Color.FromArgb(153, 101, 21);
            this.pnlHeader.Controls.Add(this.lblDateTime);
            this.pnlHeader.Controls.Add(this.lblWelcomeUser);
            this.pnlHeader.Controls.Add(this.lblShopName);
            this.pnlHeader.Dock = DockStyle.Top;
            this.pnlHeader.Location = new Point(0, 0);
            this.pnlHeader.Name = "pnlHeader";
            this.pnlHeader.Size = new Size(900, 80);
            //
            // lblShopName
            //
            this.lblShopName.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            this.lblShopName.ForeColor = Color.White;
            this.lblShopName.Location = new Point(20, 20);
            this.lblShopName.Name = "lblShopName";
            this.lblShopName.Size = new Size(400, 35);
            this.lblShopName.Text = "Zarghoon Jewelry Pro";
            //
            // lblWelcomeUser
            //
            this.lblWelcomeUser.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.lblWelcomeUser.ForeColor = Color.White;
            this.lblWelcomeUser.Location = new Point(500, 14);
            this.lblWelcomeUser.Name = "lblWelcomeUser";
            this.lblWelcomeUser.Size = new Size(380, 20);
            this.lblWelcomeUser.TextAlign = ContentAlignment.MiddleRight;
            this.lblWelcomeUser.Text = "Logged in as: -";
            //
            // lblDateTime
            //
            this.lblDateTime.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            this.lblDateTime.ForeColor = Color.White;
            this.lblDateTime.Location = new Point(500, 38);
            this.lblDateTime.Name = "lblDateTime";
            this.lblDateTime.Size = new Size(380, 20);
            this.lblDateTime.TextAlign = ContentAlignment.MiddleRight;
            this.lblDateTime.Text = "";
            //
            // pnlMenu
            //
            this.pnlMenu.Controls.Add(this.btnCustomers);
            this.pnlMenu.Controls.Add(this.btnStock);
            this.pnlMenu.Controls.Add(this.btnSales);
            this.pnlMenu.Controls.Add(this.btnRepairs);
            this.pnlMenu.Controls.Add(this.btnCashInOut);
            this.pnlMenu.Controls.Add(this.btnReports);
            this.pnlMenu.Controls.Add(this.btnSettings);
            this.pnlMenu.Controls.Add(this.btnBackup);
            this.pnlMenu.Dock = DockStyle.Fill;
            this.pnlMenu.Location = new Point(0, 80);
            this.pnlMenu.Name = "pnlMenu";
            this.pnlMenu.Size = new Size(900, 460);
            //
            // btnCustomers
            //
            this.btnCustomers.Font = new Font("Segoe UI", 11F);
            this.btnCustomers.Location = new Point(30, 40);
            this.btnCustomers.Name = "btnCustomers";
            this.btnCustomers.Size = new Size(200, 100);
            this.btnCustomers.Text = "Customers";
            this.btnCustomers.UseVisualStyleBackColor = true;
            this.btnCustomers.Click += new System.EventHandler(this.btnCustomers_Click);
            //
            // btnStock
            //
            this.btnStock.Font = new Font("Segoe UI", 11F);
            this.btnStock.Location = new Point(250, 40);
            this.btnStock.Name = "btnStock";
            this.btnStock.Size = new Size(200, 100);
            this.btnStock.Text = "Stock / Inventory";
            this.btnStock.UseVisualStyleBackColor = true;
            this.btnStock.Click += new System.EventHandler(this.btnStock_Click);
            //
            // btnSales
            //
            this.btnSales.Font = new Font("Segoe UI", 11F);
            this.btnSales.Location = new Point(470, 40);
            this.btnSales.Name = "btnSales";
            this.btnSales.Size = new Size(200, 100);
            this.btnSales.Text = "Sales Billing";
            this.btnSales.UseVisualStyleBackColor = true;
            this.btnSales.Click += new System.EventHandler(this.btnSales_Click);
            //
            // btnRepairs
            //
            this.btnRepairs.Font = new Font("Segoe UI", 11F);
            this.btnRepairs.Location = new Point(690, 40);
            this.btnRepairs.Name = "btnRepairs";
            this.btnRepairs.Size = new Size(200, 100);
            this.btnRepairs.Text = "Repairs";
            this.btnRepairs.UseVisualStyleBackColor = true;
            this.btnRepairs.Click += new System.EventHandler(this.btnRepairs_Click);
            //
            // btnCashInOut
            //
            this.btnCashInOut.Font = new Font("Segoe UI", 11F);
            this.btnCashInOut.Location = new Point(30, 180);
            this.btnCashInOut.Name = "btnCashInOut";
            this.btnCashInOut.Size = new Size(200, 100);
            this.btnCashInOut.Text = "Cash In / Out";
            this.btnCashInOut.UseVisualStyleBackColor = true;
            this.btnCashInOut.Click += new System.EventHandler(this.btnCashInOut_Click);
            //
            // btnReports
            //
            this.btnReports.Font = new Font("Segoe UI", 11F);
            this.btnReports.Location = new Point(250, 180);
            this.btnReports.Name = "btnReports";
            this.btnReports.Size = new Size(200, 100);
            this.btnReports.Text = "Reports";
            this.btnReports.UseVisualStyleBackColor = true;
            this.btnReports.Click += new System.EventHandler(this.btnReports_Click);
            //
            // btnSettings
            //
            this.btnSettings.Font = new Font("Segoe UI", 11F);
            this.btnSettings.Location = new Point(470, 180);
            this.btnSettings.Name = "btnSettings";
            this.btnSettings.Size = new Size(200, 100);
            this.btnSettings.Text = "Settings";
            this.btnSettings.UseVisualStyleBackColor = true;
            this.btnSettings.Click += new System.EventHandler(this.btnSettings_Click);
            //
            // btnBackup
            //
            this.btnBackup.Font = new Font("Segoe UI", 11F);
            this.btnBackup.Location = new Point(690, 180);
            this.btnBackup.Name = "btnBackup";
            this.btnBackup.Size = new Size(200, 100);
            this.btnBackup.Text = "Backup && Restore";
            this.btnBackup.UseVisualStyleBackColor = true;
            this.btnBackup.Click += new System.EventHandler(this.btnBackup_Click);
            //
            // pnlFooter
            //
            this.pnlFooter.Controls.Add(this.btnLogout);
            this.pnlFooter.Dock = DockStyle.Bottom;
            this.pnlFooter.Location = new Point(0, 540);
            this.pnlFooter.Name = "pnlFooter";
            this.pnlFooter.Size = new Size(900, 60);
            //
            // btnLogout
            //
            this.btnLogout.Location = new Point(20, 10);
            this.btnLogout.Name = "btnLogout";
            this.btnLogout.Size = new Size(120, 40);
            this.btnLogout.Text = "Logout";
            this.btnLogout.UseVisualStyleBackColor = true;
            this.btnLogout.Click += new System.EventHandler(this.btnLogout_Click);
            //
            // timerClock
            //
            this.timerClock.Interval = 1000;
            this.timerClock.Tick += new System.EventHandler(this.timerClock_Tick);
            //
            // frmDashboard
            //
            this.ClientSize = new Size(900, 600);
            this.Controls.Add(this.pnlMenu);
            this.Controls.Add(this.pnlFooter);
            this.Controls.Add(this.pnlHeader);
            this.MinimumSize = new Size(916, 639);
            this.Name = "frmDashboard";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Dashboard";
            this.Load += new System.EventHandler(this.frmDashboard_Load);
            this.pnlHeader.ResumeLayout(false);
            this.pnlMenu.ResumeLayout(false);
            this.pnlFooter.ResumeLayout(false);
            this.ResumeLayout(false);
        }
    }
}
