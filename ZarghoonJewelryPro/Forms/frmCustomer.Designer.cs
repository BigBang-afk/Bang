using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmCustomer
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

        private Panel pnlTop;
        private Label lblFormTitle;
        private Label lblSearch;
        private TextBox txtSearch;
        private Button btnSearch;
        private Label lblCustomerName;
        private TextBox txtCustomerName;
        private Label lblPhone;
        private TextBox txtPhone;
        private Label lblAddress;
        private TextBox txtAddress;
        private Label lblEmail;
        private TextBox txtEmail;
        private Button btnSave;
        private Button btnUpdate;
        private Button btnDelete;
        private Button btnClear;
        private Panel pnlBottom;
        private Button btnClose;
        private DataGridView dgvCustomers;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblSearch = new Label();
            this.txtSearch = new TextBox();
            this.btnSearch = new Button();
            this.lblCustomerName = new Label();
            this.txtCustomerName = new TextBox();
            this.lblPhone = new Label();
            this.txtPhone = new TextBox();
            this.lblAddress = new Label();
            this.txtAddress = new TextBox();
            this.lblEmail = new Label();
            this.txtEmail = new TextBox();
            this.btnSave = new Button();
            this.btnUpdate = new Button();
            this.btnDelete = new Button();
            this.btnClear = new Button();
            this.pnlBottom = new Panel();
            this.btnClose = new Button();
            this.dgvCustomers = new DataGridView();
            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvCustomers)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblSearch);
            this.pnlTop.Controls.Add(this.txtSearch);
            this.pnlTop.Controls.Add(this.btnSearch);
            this.pnlTop.Controls.Add(this.lblCustomerName);
            this.pnlTop.Controls.Add(this.txtCustomerName);
            this.pnlTop.Controls.Add(this.lblPhone);
            this.pnlTop.Controls.Add(this.txtPhone);
            this.pnlTop.Controls.Add(this.lblAddress);
            this.pnlTop.Controls.Add(this.txtAddress);
            this.pnlTop.Controls.Add(this.lblEmail);
            this.pnlTop.Controls.Add(this.txtEmail);
            this.pnlTop.Controls.Add(this.btnSave);
            this.pnlTop.Controls.Add(this.btnUpdate);
            this.pnlTop.Controls.Add(this.btnDelete);
            this.pnlTop.Controls.Add(this.btnClear);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(950, 190);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(320, 30);
            this.lblFormTitle.Text = "Customer Management";
            //
            // lblSearch
            //
            this.lblSearch.Location = new Point(600, 18);
            this.lblSearch.Name = "lblSearch";
            this.lblSearch.Size = new Size(60, 23);
            this.lblSearch.Text = "Search:";
            //
            // txtSearch
            //
            this.txtSearch.Location = new Point(665, 15);
            this.txtSearch.Name = "txtSearch";
            this.txtSearch.Size = new Size(180, 23);
            //
            // btnSearch
            //
            this.btnSearch.Location = new Point(855, 14);
            this.btnSearch.Name = "btnSearch";
            this.btnSearch.Size = new Size(75, 25);
            this.btnSearch.Text = "Search";
            this.btnSearch.UseVisualStyleBackColor = true;
            this.btnSearch.Click += new System.EventHandler(this.btnSearch_Click);
            //
            // lblCustomerName
            //
            this.lblCustomerName.Location = new Point(20, 58);
            this.lblCustomerName.Name = "lblCustomerName";
            this.lblCustomerName.Size = new Size(110, 23);
            this.lblCustomerName.Text = "Customer Name:";
            //
            // txtCustomerName
            //
            this.txtCustomerName.Location = new Point(140, 55);
            this.txtCustomerName.Name = "txtCustomerName";
            this.txtCustomerName.Size = new Size(220, 23);
            //
            // lblPhone
            //
            this.lblPhone.Location = new Point(380, 58);
            this.lblPhone.Name = "lblPhone";
            this.lblPhone.Size = new Size(60, 23);
            this.lblPhone.Text = "Phone:";
            //
            // txtPhone
            //
            this.txtPhone.Location = new Point(450, 55);
            this.txtPhone.Name = "txtPhone";
            this.txtPhone.Size = new Size(150, 23);
            //
            // lblAddress
            //
            this.lblAddress.Location = new Point(20, 93);
            this.lblAddress.Name = "lblAddress";
            this.lblAddress.Size = new Size(110, 23);
            this.lblAddress.Text = "Address:";
            //
            // txtAddress
            //
            this.txtAddress.Location = new Point(140, 90);
            this.txtAddress.Name = "txtAddress";
            this.txtAddress.Size = new Size(220, 23);
            //
            // lblEmail
            //
            this.lblEmail.Location = new Point(380, 93);
            this.lblEmail.Name = "lblEmail";
            this.lblEmail.Size = new Size(60, 23);
            this.lblEmail.Text = "Email:";
            //
            // txtEmail
            //
            this.txtEmail.Location = new Point(450, 90);
            this.txtEmail.Name = "txtEmail";
            this.txtEmail.Size = new Size(150, 23);
            //
            // btnSave
            //
            this.btnSave.BackColor = Color.FromArgb(153, 101, 21);
            this.btnSave.ForeColor = Color.White;
            this.btnSave.Location = new Point(140, 140);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new Size(90, 32);
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = false;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
            //
            // btnUpdate
            //
            this.btnUpdate.Location = new Point(240, 140);
            this.btnUpdate.Name = "btnUpdate";
            this.btnUpdate.Size = new Size(90, 32);
            this.btnUpdate.Text = "Update";
            this.btnUpdate.UseVisualStyleBackColor = true;
            this.btnUpdate.Click += new System.EventHandler(this.btnUpdate_Click);
            //
            // btnDelete
            //
            this.btnDelete.Location = new Point(340, 140);
            this.btnDelete.Name = "btnDelete";
            this.btnDelete.Size = new Size(90, 32);
            this.btnDelete.Text = "Delete";
            this.btnDelete.UseVisualStyleBackColor = true;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click);
            //
            // btnClear
            //
            this.btnClear.Location = new Point(440, 140);
            this.btnClear.Name = "btnClear";
            this.btnClear.Size = new Size(90, 32);
            this.btnClear.Text = "Clear";
            this.btnClear.UseVisualStyleBackColor = true;
            this.btnClear.Click += new System.EventHandler(this.btnClear_Click);
            //
            // pnlBottom
            //
            this.pnlBottom.Controls.Add(this.btnClose);
            this.pnlBottom.Dock = DockStyle.Bottom;
            this.pnlBottom.Location = new Point(0, 555);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(950, 55);
            //
            // btnClose
            //
            this.btnClose.Location = new Point(20, 10);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new Size(120, 35);
            this.btnClose.Text = "Close";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            //
            // dgvCustomers
            //
            this.dgvCustomers.AllowUserToAddRows = false;
            this.dgvCustomers.AllowUserToDeleteRows = false;
            this.dgvCustomers.Dock = DockStyle.Fill;
            this.dgvCustomers.Location = new Point(0, 190);
            this.dgvCustomers.MultiSelect = false;
            this.dgvCustomers.Name = "dgvCustomers";
            this.dgvCustomers.ReadOnly = true;
            this.dgvCustomers.RowHeadersVisible = false;
            this.dgvCustomers.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvCustomers.Size = new Size(950, 365);
            this.dgvCustomers.SelectionChanged += new System.EventHandler(this.dgvCustomers_SelectionChanged);
            //
            // frmCustomer
            //
            this.ClientSize = new Size(950, 610);
            this.Controls.Add(this.dgvCustomers);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(966, 649);
            this.Name = "frmCustomer";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Customers";
            this.Load += new System.EventHandler(this.frmCustomer_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlTop.PerformLayout();
            this.pnlBottom.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dgvCustomers)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
