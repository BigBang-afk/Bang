using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmRepair
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
        private Label lblReceiptCaption;
        private Label lblReceiptNumber;
        private Label lblCustomerName;
        private TextBox txtCustomerName;
        private Label lblCustomerPhone;
        private TextBox txtCustomerPhone;
        private Label lblSearchCaption;
        private TextBox txtSearch;
        private Button btnSearch;
        private Label lblItemDescription;
        private TextBox txtItemDescription;
        private Label lblWeight;
        private TextBox txtWeight;
        private Label lblEstimatedCost;
        private TextBox txtEstimatedCost;
        private Label lblAdvancePaid;
        private TextBox txtAdvancePaid;
        private Label lblStatus;
        private ComboBox cboStatus;
        private Label lblDeliveryDate;
        private DateTimePicker dtpDeliveryDate;
        private Button btnSave;
        private Button btnUpdate;
        private Button btnDelete;
        private Button btnClear;
        private Panel pnlBottom;
        private Button btnClose;
        private DataGridView dgvRepairs;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblReceiptCaption = new Label();
            this.lblReceiptNumber = new Label();
            this.lblCustomerName = new Label();
            this.txtCustomerName = new TextBox();
            this.lblCustomerPhone = new Label();
            this.txtCustomerPhone = new TextBox();
            this.lblSearchCaption = new Label();
            this.txtSearch = new TextBox();
            this.btnSearch = new Button();
            this.lblItemDescription = new Label();
            this.txtItemDescription = new TextBox();
            this.lblWeight = new Label();
            this.txtWeight = new TextBox();
            this.lblEstimatedCost = new Label();
            this.txtEstimatedCost = new TextBox();
            this.lblAdvancePaid = new Label();
            this.txtAdvancePaid = new TextBox();
            this.lblStatus = new Label();
            this.cboStatus = new ComboBox();
            this.lblDeliveryDate = new Label();
            this.dtpDeliveryDate = new DateTimePicker();
            this.btnSave = new Button();
            this.btnUpdate = new Button();
            this.btnDelete = new Button();
            this.btnClear = new Button();
            this.pnlBottom = new Panel();
            this.btnClose = new Button();
            this.dgvRepairs = new DataGridView();
            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvRepairs)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblReceiptCaption);
            this.pnlTop.Controls.Add(this.lblReceiptNumber);
            this.pnlTop.Controls.Add(this.lblCustomerName);
            this.pnlTop.Controls.Add(this.txtCustomerName);
            this.pnlTop.Controls.Add(this.lblCustomerPhone);
            this.pnlTop.Controls.Add(this.txtCustomerPhone);
            this.pnlTop.Controls.Add(this.lblSearchCaption);
            this.pnlTop.Controls.Add(this.txtSearch);
            this.pnlTop.Controls.Add(this.btnSearch);
            this.pnlTop.Controls.Add(this.lblItemDescription);
            this.pnlTop.Controls.Add(this.txtItemDescription);
            this.pnlTop.Controls.Add(this.lblWeight);
            this.pnlTop.Controls.Add(this.txtWeight);
            this.pnlTop.Controls.Add(this.lblEstimatedCost);
            this.pnlTop.Controls.Add(this.txtEstimatedCost);
            this.pnlTop.Controls.Add(this.lblAdvancePaid);
            this.pnlTop.Controls.Add(this.txtAdvancePaid);
            this.pnlTop.Controls.Add(this.lblStatus);
            this.pnlTop.Controls.Add(this.cboStatus);
            this.pnlTop.Controls.Add(this.lblDeliveryDate);
            this.pnlTop.Controls.Add(this.dtpDeliveryDate);
            this.pnlTop.Controls.Add(this.btnSave);
            this.pnlTop.Controls.Add(this.btnUpdate);
            this.pnlTop.Controls.Add(this.btnDelete);
            this.pnlTop.Controls.Add(this.btnClear);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(1000, 250);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(280, 30);
            this.lblFormTitle.Text = "Repair Management";
            //
            // lblReceiptCaption
            //
            this.lblReceiptCaption.Location = new Point(700, 18);
            this.lblReceiptCaption.Name = "lblReceiptCaption";
            this.lblReceiptCaption.Size = new Size(80, 23);
            this.lblReceiptCaption.Text = "Receipt #:";
            //
            // lblReceiptNumber
            //
            this.lblReceiptNumber.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.lblReceiptNumber.Location = new Point(780, 18);
            this.lblReceiptNumber.Name = "lblReceiptNumber";
            this.lblReceiptNumber.Size = new Size(150, 23);
            this.lblReceiptNumber.Text = "REP-000001";
            //
            // lblCustomerName
            //
            this.lblCustomerName.Location = new Point(20, 58);
            this.lblCustomerName.Name = "lblCustomerName";
            this.lblCustomerName.Size = new Size(115, 23);
            this.lblCustomerName.Text = "Customer Name:";
            //
            // txtCustomerName
            //
            this.txtCustomerName.Location = new Point(140, 55);
            this.txtCustomerName.Name = "txtCustomerName";
            this.txtCustomerName.Size = new Size(200, 23);
            //
            // lblCustomerPhone
            //
            this.lblCustomerPhone.Location = new Point(350, 58);
            this.lblCustomerPhone.Name = "lblCustomerPhone";
            this.lblCustomerPhone.Size = new Size(60, 23);
            this.lblCustomerPhone.Text = "Phone:";
            //
            // txtCustomerPhone
            //
            this.txtCustomerPhone.Location = new Point(415, 55);
            this.txtCustomerPhone.Name = "txtCustomerPhone";
            this.txtCustomerPhone.Size = new Size(140, 23);
            //
            // lblSearchCaption
            //
            this.lblSearchCaption.Location = new Point(600, 58);
            this.lblSearchCaption.Name = "lblSearchCaption";
            this.lblSearchCaption.Size = new Size(60, 23);
            this.lblSearchCaption.Text = "Search:";
            //
            // txtSearch
            //
            this.txtSearch.Location = new Point(665, 55);
            this.txtSearch.Name = "txtSearch";
            this.txtSearch.Size = new Size(180, 23);
            //
            // btnSearch
            //
            this.btnSearch.Location = new Point(855, 54);
            this.btnSearch.Name = "btnSearch";
            this.btnSearch.Size = new Size(75, 25);
            this.btnSearch.Text = "Search";
            this.btnSearch.UseVisualStyleBackColor = true;
            this.btnSearch.Click += new System.EventHandler(this.btnSearch_Click);
            //
            // lblItemDescription
            //
            this.lblItemDescription.Location = new Point(20, 93);
            this.lblItemDescription.Name = "lblItemDescription";
            this.lblItemDescription.Size = new Size(115, 23);
            this.lblItemDescription.Text = "Item Description:";
            //
            // txtItemDescription
            //
            this.txtItemDescription.Location = new Point(140, 90);
            this.txtItemDescription.Name = "txtItemDescription";
            this.txtItemDescription.Size = new Size(420, 23);
            //
            // lblWeight
            //
            this.lblWeight.Location = new Point(20, 128);
            this.lblWeight.Name = "lblWeight";
            this.lblWeight.Size = new Size(80, 23);
            this.lblWeight.Text = "Weight (g):";
            //
            // txtWeight
            //
            this.txtWeight.Location = new Point(105, 125);
            this.txtWeight.Name = "txtWeight";
            this.txtWeight.Size = new Size(80, 23);
            //
            // lblEstimatedCost
            //
            this.lblEstimatedCost.Location = new Point(200, 128);
            this.lblEstimatedCost.Name = "lblEstimatedCost";
            this.lblEstimatedCost.Size = new Size(100, 23);
            this.lblEstimatedCost.Text = "Est. Cost:";
            //
            // txtEstimatedCost
            //
            this.txtEstimatedCost.Location = new Point(305, 125);
            this.txtEstimatedCost.Name = "txtEstimatedCost";
            this.txtEstimatedCost.Size = new Size(90, 23);
            //
            // lblAdvancePaid
            //
            this.lblAdvancePaid.Location = new Point(410, 128);
            this.lblAdvancePaid.Name = "lblAdvancePaid";
            this.lblAdvancePaid.Size = new Size(100, 23);
            this.lblAdvancePaid.Text = "Advance Paid:";
            //
            // txtAdvancePaid
            //
            this.txtAdvancePaid.Location = new Point(515, 125);
            this.txtAdvancePaid.Name = "txtAdvancePaid";
            this.txtAdvancePaid.Size = new Size(90, 23);
            //
            // lblStatus
            //
            this.lblStatus.Location = new Point(20, 163);
            this.lblStatus.Name = "lblStatus";
            this.lblStatus.Size = new Size(60, 23);
            this.lblStatus.Text = "Status:";
            //
            // cboStatus
            //
            this.cboStatus.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboStatus.Location = new Point(85, 160);
            this.cboStatus.Name = "cboStatus";
            this.cboStatus.Size = new Size(140, 23);
            //
            // lblDeliveryDate
            //
            this.lblDeliveryDate.Location = new Point(250, 163);
            this.lblDeliveryDate.Name = "lblDeliveryDate";
            this.lblDeliveryDate.Size = new Size(100, 23);
            this.lblDeliveryDate.Text = "Delivery Date:";
            //
            // dtpDeliveryDate
            //
            this.dtpDeliveryDate.Format = DateTimePickerFormat.Short;
            this.dtpDeliveryDate.Location = new Point(355, 160);
            this.dtpDeliveryDate.Name = "dtpDeliveryDate";
            this.dtpDeliveryDate.Size = new Size(120, 23);
            //
            // btnSave
            //
            this.btnSave.BackColor = Color.FromArgb(153, 101, 21);
            this.btnSave.ForeColor = Color.White;
            this.btnSave.Location = new Point(140, 200);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new Size(90, 32);
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = false;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
            //
            // btnUpdate
            //
            this.btnUpdate.Location = new Point(240, 200);
            this.btnUpdate.Name = "btnUpdate";
            this.btnUpdate.Size = new Size(90, 32);
            this.btnUpdate.Text = "Update";
            this.btnUpdate.UseVisualStyleBackColor = true;
            this.btnUpdate.Click += new System.EventHandler(this.btnUpdate_Click);
            //
            // btnDelete
            //
            this.btnDelete.Location = new Point(340, 200);
            this.btnDelete.Name = "btnDelete";
            this.btnDelete.Size = new Size(90, 32);
            this.btnDelete.Text = "Delete";
            this.btnDelete.UseVisualStyleBackColor = true;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click);
            //
            // btnClear
            //
            this.btnClear.Location = new Point(440, 200);
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
            this.pnlBottom.Location = new Point(0, 595);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(1000, 55);
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
            // dgvRepairs
            //
            this.dgvRepairs.AllowUserToAddRows = false;
            this.dgvRepairs.AllowUserToDeleteRows = false;
            this.dgvRepairs.Dock = DockStyle.Fill;
            this.dgvRepairs.Location = new Point(0, 250);
            this.dgvRepairs.MultiSelect = false;
            this.dgvRepairs.Name = "dgvRepairs";
            this.dgvRepairs.ReadOnly = true;
            this.dgvRepairs.RowHeadersVisible = false;
            this.dgvRepairs.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvRepairs.Size = new Size(1000, 345);
            this.dgvRepairs.SelectionChanged += new System.EventHandler(this.dgvRepairs_SelectionChanged);
            //
            // frmRepair
            //
            this.ClientSize = new Size(1000, 650);
            this.Controls.Add(this.dgvRepairs);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(1016, 689);
            this.Name = "frmRepair";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Repairs";
            this.Load += new System.EventHandler(this.frmRepair_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlTop.PerformLayout();
            this.pnlBottom.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dgvRepairs)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
