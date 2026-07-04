using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmSales
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
        private Label lblInvoiceCaption;
        private Label lblInvoiceNumber;
        private Label lblDateCaption;
        private Label lblSaleDate;
        private Label lblCustomerCaption;
        private ComboBox cboCustomer;

        private Panel pnlItemEntry;
        private Label lblItemCaption;
        private ComboBox cboItem;
        private Label lblKaratCaption;
        private TextBox txtKarat;
        private Label lblWeightCaption;
        private TextBox txtWeight;
        private Label lblRateCaption;
        private TextBox txtRatePerGram;
        private Label lblMakingChargesCaption;
        private TextBox txtMakingCharges;
        private Label lblQuantityCaption;
        private TextBox txtQuantity;
        private Button btnAddItem;

        private DataGridView dgvSaleItems;

        private Panel pnlBottom;
        private Button btnRemoveItem;
        private Label lblTotalCaption;
        private Label lblTotalAmount;
        private Label lblReceivedCaption;
        private TextBox txtReceivedAmount;
        private Label lblBalanceCaption;
        private Label lblBalanceAmount;
        private Button btnSaveSale;
        private Button btnPrint;
        private Button btnClear;
        private Button btnClose;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblInvoiceCaption = new Label();
            this.lblInvoiceNumber = new Label();
            this.lblDateCaption = new Label();
            this.lblSaleDate = new Label();
            this.lblCustomerCaption = new Label();
            this.cboCustomer = new ComboBox();

            this.pnlItemEntry = new Panel();
            this.lblItemCaption = new Label();
            this.cboItem = new ComboBox();
            this.lblKaratCaption = new Label();
            this.txtKarat = new TextBox();
            this.lblWeightCaption = new Label();
            this.txtWeight = new TextBox();
            this.lblRateCaption = new Label();
            this.txtRatePerGram = new TextBox();
            this.lblMakingChargesCaption = new Label();
            this.txtMakingCharges = new TextBox();
            this.lblQuantityCaption = new Label();
            this.txtQuantity = new TextBox();
            this.btnAddItem = new Button();

            this.dgvSaleItems = new DataGridView();

            this.pnlBottom = new Panel();
            this.btnRemoveItem = new Button();
            this.lblTotalCaption = new Label();
            this.lblTotalAmount = new Label();
            this.lblReceivedCaption = new Label();
            this.txtReceivedAmount = new TextBox();
            this.lblBalanceCaption = new Label();
            this.lblBalanceAmount = new Label();
            this.btnSaveSale = new Button();
            this.btnPrint = new Button();
            this.btnClear = new Button();
            this.btnClose = new Button();

            this.pnlTop.SuspendLayout();
            this.pnlItemEntry.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvSaleItems)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblInvoiceCaption);
            this.pnlTop.Controls.Add(this.lblInvoiceNumber);
            this.pnlTop.Controls.Add(this.lblDateCaption);
            this.pnlTop.Controls.Add(this.lblSaleDate);
            this.pnlTop.Controls.Add(this.lblCustomerCaption);
            this.pnlTop.Controls.Add(this.cboCustomer);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(1000, 110);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(220, 30);
            this.lblFormTitle.Text = "Sales Billing";
            //
            // lblInvoiceCaption
            //
            this.lblInvoiceCaption.Location = new Point(600, 18);
            this.lblInvoiceCaption.Name = "lblInvoiceCaption";
            this.lblInvoiceCaption.Size = new Size(80, 23);
            this.lblInvoiceCaption.Text = "Invoice #:";
            //
            // lblInvoiceNumber
            //
            this.lblInvoiceNumber.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.lblInvoiceNumber.Location = new Point(680, 18);
            this.lblInvoiceNumber.Name = "lblInvoiceNumber";
            this.lblInvoiceNumber.Size = new Size(140, 23);
            this.lblInvoiceNumber.Text = "INV-000001";
            //
            // lblDateCaption
            //
            this.lblDateCaption.Location = new Point(830, 18);
            this.lblDateCaption.Name = "lblDateCaption";
            this.lblDateCaption.Size = new Size(40, 23);
            this.lblDateCaption.Text = "Date:";
            //
            // lblSaleDate
            //
            this.lblSaleDate.Location = new Point(870, 18);
            this.lblSaleDate.Name = "lblSaleDate";
            this.lblSaleDate.Size = new Size(110, 23);
            this.lblSaleDate.Text = "";
            //
            // lblCustomerCaption
            //
            this.lblCustomerCaption.Location = new Point(20, 58);
            this.lblCustomerCaption.Name = "lblCustomerCaption";
            this.lblCustomerCaption.Size = new Size(80, 23);
            this.lblCustomerCaption.Text = "Customer:";
            //
            // cboCustomer
            //
            this.cboCustomer.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboCustomer.Location = new Point(100, 55);
            this.cboCustomer.Name = "cboCustomer";
            this.cboCustomer.Size = new Size(280, 23);
            //
            // pnlItemEntry
            //
            this.pnlItemEntry.Controls.Add(this.lblItemCaption);
            this.pnlItemEntry.Controls.Add(this.cboItem);
            this.pnlItemEntry.Controls.Add(this.lblKaratCaption);
            this.pnlItemEntry.Controls.Add(this.txtKarat);
            this.pnlItemEntry.Controls.Add(this.lblWeightCaption);
            this.pnlItemEntry.Controls.Add(this.txtWeight);
            this.pnlItemEntry.Controls.Add(this.lblRateCaption);
            this.pnlItemEntry.Controls.Add(this.txtRatePerGram);
            this.pnlItemEntry.Controls.Add(this.lblMakingChargesCaption);
            this.pnlItemEntry.Controls.Add(this.txtMakingCharges);
            this.pnlItemEntry.Controls.Add(this.lblQuantityCaption);
            this.pnlItemEntry.Controls.Add(this.txtQuantity);
            this.pnlItemEntry.Controls.Add(this.btnAddItem);
            this.pnlItemEntry.Dock = DockStyle.Top;
            this.pnlItemEntry.Location = new Point(0, 110);
            this.pnlItemEntry.Name = "pnlItemEntry";
            this.pnlItemEntry.Size = new Size(1000, 95);
            //
            // lblItemCaption
            //
            this.lblItemCaption.Location = new Point(20, 13);
            this.lblItemCaption.Name = "lblItemCaption";
            this.lblItemCaption.Size = new Size(40, 23);
            this.lblItemCaption.Text = "Item:";
            //
            // cboItem
            //
            this.cboItem.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboItem.Location = new Point(60, 10);
            this.cboItem.Name = "cboItem";
            this.cboItem.Size = new Size(240, 23);
            this.cboItem.SelectedIndexChanged += new System.EventHandler(this.cboItem_SelectedIndexChanged);
            //
            // lblKaratCaption
            //
            this.lblKaratCaption.Location = new Point(310, 13);
            this.lblKaratCaption.Name = "lblKaratCaption";
            this.lblKaratCaption.Size = new Size(45, 23);
            this.lblKaratCaption.Text = "Karat:";
            //
            // txtKarat
            //
            this.txtKarat.Location = new Point(355, 10);
            this.txtKarat.Name = "txtKarat";
            this.txtKarat.ReadOnly = true;
            this.txtKarat.Size = new Size(55, 23);
            //
            // lblWeightCaption
            //
            this.lblWeightCaption.Location = new Point(420, 13);
            this.lblWeightCaption.Name = "lblWeightCaption";
            this.lblWeightCaption.Size = new Size(75, 23);
            this.lblWeightCaption.Text = "Weight (g):";
            //
            // txtWeight
            //
            this.txtWeight.Location = new Point(495, 10);
            this.txtWeight.Name = "txtWeight";
            this.txtWeight.ReadOnly = true;
            this.txtWeight.Size = new Size(65, 23);
            //
            // lblRateCaption
            //
            this.lblRateCaption.Location = new Point(20, 48);
            this.lblRateCaption.Name = "lblRateCaption";
            this.lblRateCaption.Size = new Size(75, 23);
            this.lblRateCaption.Text = "Rate/Gram:";
            //
            // txtRatePerGram
            //
            this.txtRatePerGram.Location = new Point(100, 45);
            this.txtRatePerGram.Name = "txtRatePerGram";
            this.txtRatePerGram.Size = new Size(80, 23);
            //
            // lblMakingChargesCaption
            //
            this.lblMakingChargesCaption.Location = new Point(200, 48);
            this.lblMakingChargesCaption.Name = "lblMakingChargesCaption";
            this.lblMakingChargesCaption.Size = new Size(110, 23);
            this.lblMakingChargesCaption.Text = "Making Charges:";
            //
            // txtMakingCharges
            //
            this.txtMakingCharges.Location = new Point(315, 45);
            this.txtMakingCharges.Name = "txtMakingCharges";
            this.txtMakingCharges.Size = new Size(80, 23);
            //
            // lblQuantityCaption
            //
            this.lblQuantityCaption.Location = new Point(410, 48);
            this.lblQuantityCaption.Name = "lblQuantityCaption";
            this.lblQuantityCaption.Size = new Size(35, 23);
            this.lblQuantityCaption.Text = "Qty:";
            //
            // txtQuantity
            //
            this.txtQuantity.Location = new Point(450, 45);
            this.txtQuantity.Name = "txtQuantity";
            this.txtQuantity.Size = new Size(50, 23);
            this.txtQuantity.Text = "1";
            //
            // btnAddItem
            //
            this.btnAddItem.Location = new Point(520, 44);
            this.btnAddItem.Name = "btnAddItem";
            this.btnAddItem.Size = new Size(110, 28);
            this.btnAddItem.Text = "Add Item";
            this.btnAddItem.UseVisualStyleBackColor = true;
            this.btnAddItem.Click += new System.EventHandler(this.btnAddItem_Click);
            //
            // dgvSaleItems
            //
            this.dgvSaleItems.AllowUserToAddRows = false;
            this.dgvSaleItems.AllowUserToDeleteRows = false;
            this.dgvSaleItems.Dock = DockStyle.Fill;
            this.dgvSaleItems.Location = new Point(0, 205);
            this.dgvSaleItems.MultiSelect = false;
            this.dgvSaleItems.Name = "dgvSaleItems";
            this.dgvSaleItems.ReadOnly = true;
            this.dgvSaleItems.RowHeadersVisible = false;
            this.dgvSaleItems.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvSaleItems.Size = new Size(1000, 345);
            //
            // pnlBottom
            //
            this.pnlBottom.Controls.Add(this.btnRemoveItem);
            this.pnlBottom.Controls.Add(this.lblTotalCaption);
            this.pnlBottom.Controls.Add(this.lblTotalAmount);
            this.pnlBottom.Controls.Add(this.lblReceivedCaption);
            this.pnlBottom.Controls.Add(this.txtReceivedAmount);
            this.pnlBottom.Controls.Add(this.lblBalanceCaption);
            this.pnlBottom.Controls.Add(this.lblBalanceAmount);
            this.pnlBottom.Controls.Add(this.btnSaveSale);
            this.pnlBottom.Controls.Add(this.btnPrint);
            this.pnlBottom.Controls.Add(this.btnClear);
            this.pnlBottom.Controls.Add(this.btnClose);
            this.pnlBottom.Dock = DockStyle.Bottom;
            this.pnlBottom.Location = new Point(0, 550);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(1000, 150);
            //
            // btnRemoveItem
            //
            this.btnRemoveItem.Location = new Point(20, 10);
            this.btnRemoveItem.Name = "btnRemoveItem";
            this.btnRemoveItem.Size = new Size(160, 32);
            this.btnRemoveItem.Text = "Remove Selected Item";
            this.btnRemoveItem.UseVisualStyleBackColor = true;
            this.btnRemoveItem.Click += new System.EventHandler(this.btnRemoveItem_Click);
            //
            // lblTotalCaption
            //
            this.lblTotalCaption.Location = new Point(400, 15);
            this.lblTotalCaption.Name = "lblTotalCaption";
            this.lblTotalCaption.Size = new Size(100, 23);
            this.lblTotalCaption.Text = "Total Amount:";
            //
            // lblTotalAmount
            //
            this.lblTotalAmount.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblTotalAmount.Location = new Point(505, 15);
            this.lblTotalAmount.Name = "lblTotalAmount";
            this.lblTotalAmount.Size = new Size(120, 23);
            this.lblTotalAmount.Text = "0.00";
            //
            // lblReceivedCaption
            //
            this.lblReceivedCaption.Location = new Point(400, 54);
            this.lblReceivedCaption.Name = "lblReceivedCaption";
            this.lblReceivedCaption.Size = new Size(90, 23);
            this.lblReceivedCaption.Text = "Received:";
            //
            // txtReceivedAmount
            //
            this.txtReceivedAmount.Location = new Point(495, 51);
            this.txtReceivedAmount.Name = "txtReceivedAmount";
            this.txtReceivedAmount.Size = new Size(120, 23);
            this.txtReceivedAmount.TextChanged += new System.EventHandler(this.txtReceivedAmount_TextChanged);
            //
            // lblBalanceCaption
            //
            this.lblBalanceCaption.Location = new Point(650, 54);
            this.lblBalanceCaption.Name = "lblBalanceCaption";
            this.lblBalanceCaption.Size = new Size(80, 23);
            this.lblBalanceCaption.Text = "Balance:";
            //
            // lblBalanceAmount
            //
            this.lblBalanceAmount.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblBalanceAmount.Location = new Point(735, 54);
            this.lblBalanceAmount.Name = "lblBalanceAmount";
            this.lblBalanceAmount.Size = new Size(160, 23);
            this.lblBalanceAmount.Text = "0.00";
            //
            // btnSaveSale
            //
            this.btnSaveSale.BackColor = Color.FromArgb(153, 101, 21);
            this.btnSaveSale.ForeColor = Color.White;
            this.btnSaveSale.Location = new Point(400, 95);
            this.btnSaveSale.Name = "btnSaveSale";
            this.btnSaveSale.Size = new Size(110, 32);
            this.btnSaveSale.Text = "Save Sale";
            this.btnSaveSale.UseVisualStyleBackColor = false;
            this.btnSaveSale.Click += new System.EventHandler(this.btnSaveSale_Click);
            //
            // btnPrint
            //
            this.btnPrint.Location = new Point(520, 95);
            this.btnPrint.Name = "btnPrint";
            this.btnPrint.Size = new Size(110, 32);
            this.btnPrint.Text = "Print Receipt";
            this.btnPrint.UseVisualStyleBackColor = true;
            this.btnPrint.Click += new System.EventHandler(this.btnPrint_Click);
            //
            // btnClear
            //
            this.btnClear.Location = new Point(640, 95);
            this.btnClear.Name = "btnClear";
            this.btnClear.Size = new Size(90, 32);
            this.btnClear.Text = "Clear";
            this.btnClear.UseVisualStyleBackColor = true;
            this.btnClear.Click += new System.EventHandler(this.btnClear_Click);
            //
            // btnClose
            //
            this.btnClose.Location = new Point(740, 95);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new Size(90, 32);
            this.btnClose.Text = "Close";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            //
            // frmSales
            //
            this.ClientSize = new Size(1000, 700);
            this.Controls.Add(this.dgvSaleItems);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlItemEntry);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(1016, 739);
            this.Name = "frmSales";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Sales Billing";
            this.Load += new System.EventHandler(this.frmSales_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlItemEntry.ResumeLayout(false);
            this.pnlItemEntry.PerformLayout();
            this.pnlBottom.ResumeLayout(false);
            this.pnlBottom.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvSaleItems)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
