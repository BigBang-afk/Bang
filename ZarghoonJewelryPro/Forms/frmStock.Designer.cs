using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmStock
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
        private Label lblItemCode;
        private TextBox txtItemCode;
        private Label lblItemName;
        private TextBox txtItemName;
        private Label lblCategory;
        private ComboBox cboCategory;
        private Label lblKarat;
        private ComboBox cboKarat;
        private Label lblWeight;
        private TextBox txtWeight;
        private Label lblMakingCharges;
        private TextBox txtMakingCharges;
        private Label lblQuantity;
        private TextBox txtQuantity;
        private Button btnSave;
        private Button btnUpdate;
        private Button btnDelete;
        private Button btnClear;
        private Panel pnlBottom;
        private Button btnClose;
        private DataGridView dgvStock;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblSearch = new Label();
            this.txtSearch = new TextBox();
            this.btnSearch = new Button();
            this.lblItemCode = new Label();
            this.txtItemCode = new TextBox();
            this.lblItemName = new Label();
            this.txtItemName = new TextBox();
            this.lblCategory = new Label();
            this.cboCategory = new ComboBox();
            this.lblKarat = new Label();
            this.cboKarat = new ComboBox();
            this.lblWeight = new Label();
            this.txtWeight = new TextBox();
            this.lblMakingCharges = new Label();
            this.txtMakingCharges = new TextBox();
            this.lblQuantity = new Label();
            this.txtQuantity = new TextBox();
            this.btnSave = new Button();
            this.btnUpdate = new Button();
            this.btnDelete = new Button();
            this.btnClear = new Button();
            this.pnlBottom = new Panel();
            this.btnClose = new Button();
            this.dgvStock = new DataGridView();
            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvStock)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblSearch);
            this.pnlTop.Controls.Add(this.txtSearch);
            this.pnlTop.Controls.Add(this.btnSearch);
            this.pnlTop.Controls.Add(this.lblItemCode);
            this.pnlTop.Controls.Add(this.txtItemCode);
            this.pnlTop.Controls.Add(this.lblItemName);
            this.pnlTop.Controls.Add(this.txtItemName);
            this.pnlTop.Controls.Add(this.lblCategory);
            this.pnlTop.Controls.Add(this.cboCategory);
            this.pnlTop.Controls.Add(this.lblKarat);
            this.pnlTop.Controls.Add(this.cboKarat);
            this.pnlTop.Controls.Add(this.lblWeight);
            this.pnlTop.Controls.Add(this.txtWeight);
            this.pnlTop.Controls.Add(this.lblMakingCharges);
            this.pnlTop.Controls.Add(this.txtMakingCharges);
            this.pnlTop.Controls.Add(this.lblQuantity);
            this.pnlTop.Controls.Add(this.txtQuantity);
            this.pnlTop.Controls.Add(this.btnSave);
            this.pnlTop.Controls.Add(this.btnUpdate);
            this.pnlTop.Controls.Add(this.btnDelete);
            this.pnlTop.Controls.Add(this.btnClear);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(950, 220);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(400, 30);
            this.lblFormTitle.Text = "Stock / Inventory Management";
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
            // lblItemCode
            //
            this.lblItemCode.Location = new Point(20, 58);
            this.lblItemCode.Name = "lblItemCode";
            this.lblItemCode.Size = new Size(100, 23);
            this.lblItemCode.Text = "Item Code:";
            //
            // txtItemCode
            //
            this.txtItemCode.Location = new Point(130, 55);
            this.txtItemCode.Name = "txtItemCode";
            this.txtItemCode.Size = new Size(150, 23);
            //
            // lblItemName
            //
            this.lblItemName.Location = new Point(300, 58);
            this.lblItemName.Name = "lblItemName";
            this.lblItemName.Size = new Size(100, 23);
            this.lblItemName.Text = "Item Name:";
            //
            // txtItemName
            //
            this.txtItemName.Location = new Point(400, 55);
            this.txtItemName.Name = "txtItemName";
            this.txtItemName.Size = new Size(220, 23);
            //
            // lblCategory
            //
            this.lblCategory.Location = new Point(20, 93);
            this.lblCategory.Name = "lblCategory";
            this.lblCategory.Size = new Size(100, 23);
            this.lblCategory.Text = "Category:";
            //
            // cboCategory
            //
            this.cboCategory.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboCategory.Location = new Point(130, 90);
            this.cboCategory.Name = "cboCategory";
            this.cboCategory.Size = new Size(150, 23);
            //
            // lblKarat
            //
            this.lblKarat.Location = new Point(300, 93);
            this.lblKarat.Name = "lblKarat";
            this.lblKarat.Size = new Size(100, 23);
            this.lblKarat.Text = "Karat:";
            //
            // cboKarat
            //
            this.cboKarat.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboKarat.Location = new Point(400, 90);
            this.cboKarat.Name = "cboKarat";
            this.cboKarat.Size = new Size(150, 23);
            //
            // lblWeight
            //
            this.lblWeight.Location = new Point(20, 128);
            this.lblWeight.Name = "lblWeight";
            this.lblWeight.Size = new Size(100, 23);
            this.lblWeight.Text = "Weight (g):";
            //
            // txtWeight
            //
            this.txtWeight.Location = new Point(130, 125);
            this.txtWeight.Name = "txtWeight";
            this.txtWeight.Size = new Size(100, 23);
            //
            // lblMakingCharges
            //
            this.lblMakingCharges.Location = new Point(300, 128);
            this.lblMakingCharges.Name = "lblMakingCharges";
            this.lblMakingCharges.Size = new Size(120, 23);
            this.lblMakingCharges.Text = "Making Charges:";
            //
            // txtMakingCharges
            //
            this.txtMakingCharges.Location = new Point(420, 125);
            this.txtMakingCharges.Name = "txtMakingCharges";
            this.txtMakingCharges.Size = new Size(100, 23);
            //
            // lblQuantity
            //
            this.lblQuantity.Location = new Point(600, 128);
            this.lblQuantity.Name = "lblQuantity";
            this.lblQuantity.Size = new Size(50, 23);
            this.lblQuantity.Text = "Qty:";
            //
            // txtQuantity
            //
            this.txtQuantity.Location = new Point(655, 125);
            this.txtQuantity.Name = "txtQuantity";
            this.txtQuantity.Size = new Size(60, 23);
            //
            // btnSave
            //
            this.btnSave.BackColor = Color.FromArgb(153, 101, 21);
            this.btnSave.ForeColor = Color.White;
            this.btnSave.Location = new Point(130, 170);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new Size(90, 32);
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = false;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
            //
            // btnUpdate
            //
            this.btnUpdate.Location = new Point(230, 170);
            this.btnUpdate.Name = "btnUpdate";
            this.btnUpdate.Size = new Size(90, 32);
            this.btnUpdate.Text = "Update";
            this.btnUpdate.UseVisualStyleBackColor = true;
            this.btnUpdate.Click += new System.EventHandler(this.btnUpdate_Click);
            //
            // btnDelete
            //
            this.btnDelete.Location = new Point(330, 170);
            this.btnDelete.Name = "btnDelete";
            this.btnDelete.Size = new Size(90, 32);
            this.btnDelete.Text = "Delete";
            this.btnDelete.UseVisualStyleBackColor = true;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click);
            //
            // btnClear
            //
            this.btnClear.Location = new Point(430, 170);
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
            // dgvStock
            //
            this.dgvStock.AllowUserToAddRows = false;
            this.dgvStock.AllowUserToDeleteRows = false;
            this.dgvStock.Dock = DockStyle.Fill;
            this.dgvStock.Location = new Point(0, 220);
            this.dgvStock.MultiSelect = false;
            this.dgvStock.Name = "dgvStock";
            this.dgvStock.ReadOnly = true;
            this.dgvStock.RowHeadersVisible = false;
            this.dgvStock.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvStock.Size = new Size(950, 335);
            this.dgvStock.SelectionChanged += new System.EventHandler(this.dgvStock_SelectionChanged);
            //
            // frmStock
            //
            this.ClientSize = new Size(950, 610);
            this.Controls.Add(this.dgvStock);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(966, 649);
            this.Name = "frmStock";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Stock / Inventory";
            this.Load += new System.EventHandler(this.frmStock_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlTop.PerformLayout();
            this.pnlBottom.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dgvStock)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
