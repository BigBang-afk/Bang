using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmCashInOut
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
        private Label lblSearchCaption;
        private TextBox txtSearch;
        private Button btnSearch;
        private Label lblType;
        private ComboBox cboType;
        private Label lblCategory;
        private ComboBox cboCategory;
        private Label lblAmount;
        private TextBox txtAmount;
        private Label lblDescription;
        private TextBox txtDescription;
        private Button btnSave;
        private Button btnUpdate;
        private Button btnDelete;
        private Button btnClear;

        private DataGridView dgvCashTransactions;

        private Panel pnlBottom;
        private Label lblTotalInCaption;
        private Label lblTotalIn;
        private Label lblTotalOutCaption;
        private Label lblTotalOut;
        private Label lblNetBalanceCaption;
        private Label lblNetBalance;
        private Button btnClose;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblSearchCaption = new Label();
            this.txtSearch = new TextBox();
            this.btnSearch = new Button();
            this.lblType = new Label();
            this.cboType = new ComboBox();
            this.lblCategory = new Label();
            this.cboCategory = new ComboBox();
            this.lblAmount = new Label();
            this.txtAmount = new TextBox();
            this.lblDescription = new Label();
            this.txtDescription = new TextBox();
            this.btnSave = new Button();
            this.btnUpdate = new Button();
            this.btnDelete = new Button();
            this.btnClear = new Button();

            this.dgvCashTransactions = new DataGridView();

            this.pnlBottom = new Panel();
            this.lblTotalInCaption = new Label();
            this.lblTotalIn = new Label();
            this.lblTotalOutCaption = new Label();
            this.lblTotalOut = new Label();
            this.lblNetBalanceCaption = new Label();
            this.lblNetBalance = new Label();
            this.btnClose = new Button();

            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvCashTransactions)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblSearchCaption);
            this.pnlTop.Controls.Add(this.txtSearch);
            this.pnlTop.Controls.Add(this.btnSearch);
            this.pnlTop.Controls.Add(this.lblType);
            this.pnlTop.Controls.Add(this.cboType);
            this.pnlTop.Controls.Add(this.lblCategory);
            this.pnlTop.Controls.Add(this.cboCategory);
            this.pnlTop.Controls.Add(this.lblAmount);
            this.pnlTop.Controls.Add(this.txtAmount);
            this.pnlTop.Controls.Add(this.lblDescription);
            this.pnlTop.Controls.Add(this.txtDescription);
            this.pnlTop.Controls.Add(this.btnSave);
            this.pnlTop.Controls.Add(this.btnUpdate);
            this.pnlTop.Controls.Add(this.btnDelete);
            this.pnlTop.Controls.Add(this.btnClear);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(950, 170);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(220, 30);
            this.lblFormTitle.Text = "Cash In / Out";
            //
            // lblSearchCaption
            //
            this.lblSearchCaption.Location = new Point(600, 18);
            this.lblSearchCaption.Name = "lblSearchCaption";
            this.lblSearchCaption.Size = new Size(60, 23);
            this.lblSearchCaption.Text = "Search:";
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
            // lblType
            //
            this.lblType.Location = new Point(20, 58);
            this.lblType.Name = "lblType";
            this.lblType.Size = new Size(50, 23);
            this.lblType.Text = "Type:";
            //
            // cboType
            //
            this.cboType.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboType.Location = new Point(75, 55);
            this.cboType.Name = "cboType";
            this.cboType.Size = new Size(90, 23);
            //
            // lblCategory
            //
            this.lblCategory.Location = new Point(180, 58);
            this.lblCategory.Name = "lblCategory";
            this.lblCategory.Size = new Size(70, 23);
            this.lblCategory.Text = "Category:";
            //
            // cboCategory
            //
            this.cboCategory.DropDownStyle = ComboBoxStyle.DropDown;
            this.cboCategory.Location = new Point(255, 55);
            this.cboCategory.Name = "cboCategory";
            this.cboCategory.Size = new Size(180, 23);
            //
            // lblAmount
            //
            this.lblAmount.Location = new Point(450, 58);
            this.lblAmount.Name = "lblAmount";
            this.lblAmount.Size = new Size(60, 23);
            this.lblAmount.Text = "Amount:";
            //
            // txtAmount
            //
            this.txtAmount.Location = new Point(515, 55);
            this.txtAmount.Name = "txtAmount";
            this.txtAmount.Size = new Size(100, 23);
            //
            // lblDescription
            //
            this.lblDescription.Location = new Point(20, 93);
            this.lblDescription.Name = "lblDescription";
            this.lblDescription.Size = new Size(80, 23);
            this.lblDescription.Text = "Description:";
            //
            // txtDescription
            //
            this.txtDescription.Location = new Point(105, 90);
            this.txtDescription.Name = "txtDescription";
            this.txtDescription.Size = new Size(510, 23);
            //
            // btnSave
            //
            this.btnSave.BackColor = Color.FromArgb(153, 101, 21);
            this.btnSave.ForeColor = Color.White;
            this.btnSave.Location = new Point(140, 125);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new Size(90, 32);
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = false;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
            //
            // btnUpdate
            //
            this.btnUpdate.Location = new Point(240, 125);
            this.btnUpdate.Name = "btnUpdate";
            this.btnUpdate.Size = new Size(90, 32);
            this.btnUpdate.Text = "Update";
            this.btnUpdate.UseVisualStyleBackColor = true;
            this.btnUpdate.Click += new System.EventHandler(this.btnUpdate_Click);
            //
            // btnDelete
            //
            this.btnDelete.Location = new Point(340, 125);
            this.btnDelete.Name = "btnDelete";
            this.btnDelete.Size = new Size(90, 32);
            this.btnDelete.Text = "Delete";
            this.btnDelete.UseVisualStyleBackColor = true;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click);
            //
            // btnClear
            //
            this.btnClear.Location = new Point(440, 125);
            this.btnClear.Name = "btnClear";
            this.btnClear.Size = new Size(90, 32);
            this.btnClear.Text = "Clear";
            this.btnClear.UseVisualStyleBackColor = true;
            this.btnClear.Click += new System.EventHandler(this.btnClear_Click);
            //
            // dgvCashTransactions
            //
            this.dgvCashTransactions.AllowUserToAddRows = false;
            this.dgvCashTransactions.AllowUserToDeleteRows = false;
            this.dgvCashTransactions.Dock = DockStyle.Fill;
            this.dgvCashTransactions.Location = new Point(0, 170);
            this.dgvCashTransactions.MultiSelect = false;
            this.dgvCashTransactions.Name = "dgvCashTransactions";
            this.dgvCashTransactions.ReadOnly = true;
            this.dgvCashTransactions.RowHeadersVisible = false;
            this.dgvCashTransactions.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvCashTransactions.Size = new Size(950, 335);
            this.dgvCashTransactions.SelectionChanged += new System.EventHandler(this.dgvCashTransactions_SelectionChanged);
            //
            // pnlBottom
            //
            this.pnlBottom.Controls.Add(this.lblTotalInCaption);
            this.pnlBottom.Controls.Add(this.lblTotalIn);
            this.pnlBottom.Controls.Add(this.lblTotalOutCaption);
            this.pnlBottom.Controls.Add(this.lblTotalOut);
            this.pnlBottom.Controls.Add(this.lblNetBalanceCaption);
            this.pnlBottom.Controls.Add(this.lblNetBalance);
            this.pnlBottom.Controls.Add(this.btnClose);
            this.pnlBottom.Dock = DockStyle.Bottom;
            this.pnlBottom.Location = new Point(0, 505);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(950, 90);
            //
            // lblTotalInCaption
            //
            this.lblTotalInCaption.Location = new Point(20, 14);
            this.lblTotalInCaption.Name = "lblTotalInCaption";
            this.lblTotalInCaption.Size = new Size(70, 23);
            this.lblTotalInCaption.Text = "Total In:";
            //
            // lblTotalIn
            //
            this.lblTotalIn.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblTotalIn.ForeColor = Color.Green;
            this.lblTotalIn.Location = new Point(90, 14);
            this.lblTotalIn.Name = "lblTotalIn";
            this.lblTotalIn.Size = new Size(120, 23);
            this.lblTotalIn.Text = "0.00";
            //
            // lblTotalOutCaption
            //
            this.lblTotalOutCaption.Location = new Point(220, 14);
            this.lblTotalOutCaption.Name = "lblTotalOutCaption";
            this.lblTotalOutCaption.Size = new Size(80, 23);
            this.lblTotalOutCaption.Text = "Total Out:";
            //
            // lblTotalOut
            //
            this.lblTotalOut.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblTotalOut.ForeColor = Color.Red;
            this.lblTotalOut.Location = new Point(300, 14);
            this.lblTotalOut.Name = "lblTotalOut";
            this.lblTotalOut.Size = new Size(120, 23);
            this.lblTotalOut.Text = "0.00";
            //
            // lblNetBalanceCaption
            //
            this.lblNetBalanceCaption.Location = new Point(430, 14);
            this.lblNetBalanceCaption.Name = "lblNetBalanceCaption";
            this.lblNetBalanceCaption.Size = new Size(90, 23);
            this.lblNetBalanceCaption.Text = "Net Balance:";
            //
            // lblNetBalance
            //
            this.lblNetBalance.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblNetBalance.Location = new Point(520, 14);
            this.lblNetBalance.Name = "lblNetBalance";
            this.lblNetBalance.Size = new Size(150, 23);
            this.lblNetBalance.Text = "0.00";
            //
            // btnClose
            //
            this.btnClose.Location = new Point(20, 45);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new Size(120, 35);
            this.btnClose.Text = "Close";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            //
            // frmCashInOut
            //
            this.ClientSize = new Size(950, 595);
            this.Controls.Add(this.dgvCashTransactions);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(966, 634);
            this.Name = "frmCashInOut";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Cash In / Out";
            this.Load += new System.EventHandler(this.frmCashInOut_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlTop.PerformLayout();
            this.pnlBottom.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dgvCashTransactions)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
