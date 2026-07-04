using System.Drawing;
using System.Drawing.Printing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmReports
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
        private Label lblReportTypeCaption;
        private ComboBox cboReportType;
        private Label lblFromDateCaption;
        private DateTimePicker dtpFromDate;
        private Label lblToDateCaption;
        private DateTimePicker dtpToDate;
        private Label lblCustomerCaption;
        private ComboBox cboCustomer;
        private Button btnGenerate;

        private DataGridView dgvReport;

        private Panel pnlBottom;
        private Label lblSummary;
        private Button btnExportCsv;
        private Button btnPrint;
        private Button btnClose;

        private PrintDocument printDocumentReport;

        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblReportTypeCaption = new Label();
            this.cboReportType = new ComboBox();
            this.lblFromDateCaption = new Label();
            this.dtpFromDate = new DateTimePicker();
            this.lblToDateCaption = new Label();
            this.dtpToDate = new DateTimePicker();
            this.lblCustomerCaption = new Label();
            this.cboCustomer = new ComboBox();
            this.btnGenerate = new Button();

            this.dgvReport = new DataGridView();

            this.pnlBottom = new Panel();
            this.lblSummary = new Label();
            this.btnExportCsv = new Button();
            this.btnPrint = new Button();
            this.btnClose = new Button();

            this.printDocumentReport = new PrintDocument();

            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dgvReport)).BeginInit();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblReportTypeCaption);
            this.pnlTop.Controls.Add(this.cboReportType);
            this.pnlTop.Controls.Add(this.lblFromDateCaption);
            this.pnlTop.Controls.Add(this.dtpFromDate);
            this.pnlTop.Controls.Add(this.lblToDateCaption);
            this.pnlTop.Controls.Add(this.dtpToDate);
            this.pnlTop.Controls.Add(this.lblCustomerCaption);
            this.pnlTop.Controls.Add(this.cboCustomer);
            this.pnlTop.Controls.Add(this.btnGenerate);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(1000, 100);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(150, 30);
            this.lblFormTitle.Text = "Reports";
            //
            // lblReportTypeCaption
            //
            this.lblReportTypeCaption.Location = new Point(200, 18);
            this.lblReportTypeCaption.Name = "lblReportTypeCaption";
            this.lblReportTypeCaption.Size = new Size(90, 23);
            this.lblReportTypeCaption.Text = "Report Type:";
            //
            // cboReportType
            //
            this.cboReportType.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboReportType.Location = new Point(295, 15);
            this.cboReportType.Name = "cboReportType";
            this.cboReportType.Size = new Size(180, 23);
            this.cboReportType.SelectedIndexChanged += new System.EventHandler(this.cboReportType_SelectedIndexChanged);
            //
            // lblFromDateCaption
            //
            this.lblFromDateCaption.Location = new Point(500, 18);
            this.lblFromDateCaption.Name = "lblFromDateCaption";
            this.lblFromDateCaption.Size = new Size(45, 23);
            this.lblFromDateCaption.Text = "From:";
            //
            // dtpFromDate
            //
            this.dtpFromDate.Format = DateTimePickerFormat.Short;
            this.dtpFromDate.Location = new Point(550, 15);
            this.dtpFromDate.Name = "dtpFromDate";
            this.dtpFromDate.Size = new Size(110, 23);
            //
            // lblToDateCaption
            //
            this.lblToDateCaption.Location = new Point(670, 18);
            this.lblToDateCaption.Name = "lblToDateCaption";
            this.lblToDateCaption.Size = new Size(30, 23);
            this.lblToDateCaption.Text = "To:";
            //
            // dtpToDate
            //
            this.dtpToDate.Format = DateTimePickerFormat.Short;
            this.dtpToDate.Location = new Point(705, 15);
            this.dtpToDate.Name = "dtpToDate";
            this.dtpToDate.Size = new Size(110, 23);
            //
            // btnGenerate
            //
            this.btnGenerate.BackColor = Color.FromArgb(153, 101, 21);
            this.btnGenerate.ForeColor = Color.White;
            this.btnGenerate.Location = new Point(835, 14);
            this.btnGenerate.Name = "btnGenerate";
            this.btnGenerate.Size = new Size(130, 25);
            this.btnGenerate.Text = "Generate";
            this.btnGenerate.UseVisualStyleBackColor = false;
            this.btnGenerate.Click += new System.EventHandler(this.btnGenerate_Click);
            //
            // lblCustomerCaption
            //
            this.lblCustomerCaption.Location = new Point(500, 55);
            this.lblCustomerCaption.Name = "lblCustomerCaption";
            this.lblCustomerCaption.Size = new Size(70, 23);
            this.lblCustomerCaption.Text = "Customer:";
            this.lblCustomerCaption.Visible = false;
            //
            // cboCustomer
            //
            this.cboCustomer.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboCustomer.Location = new Point(570, 52);
            this.cboCustomer.Name = "cboCustomer";
            this.cboCustomer.Size = new Size(280, 23);
            this.cboCustomer.Visible = false;
            //
            // dgvReport
            //
            this.dgvReport.AllowUserToAddRows = false;
            this.dgvReport.AllowUserToDeleteRows = false;
            this.dgvReport.Dock = DockStyle.Fill;
            this.dgvReport.Location = new Point(0, 100);
            this.dgvReport.MultiSelect = false;
            this.dgvReport.Name = "dgvReport";
            this.dgvReport.ReadOnly = true;
            this.dgvReport.RowHeadersVisible = false;
            this.dgvReport.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dgvReport.Size = new Size(1000, 460);
            //
            // pnlBottom
            //
            this.pnlBottom.Controls.Add(this.lblSummary);
            this.pnlBottom.Controls.Add(this.btnExportCsv);
            this.pnlBottom.Controls.Add(this.btnPrint);
            this.pnlBottom.Controls.Add(this.btnClose);
            this.pnlBottom.Dock = DockStyle.Bottom;
            this.pnlBottom.Location = new Point(0, 560);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(1000, 90);
            //
            // lblSummary
            //
            this.lblSummary.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblSummary.Location = new Point(20, 12);
            this.lblSummary.Name = "lblSummary";
            this.lblSummary.Size = new Size(900, 25);
            this.lblSummary.Text = "";
            //
            // btnExportCsv
            //
            this.btnExportCsv.Location = new Point(20, 45);
            this.btnExportCsv.Name = "btnExportCsv";
            this.btnExportCsv.Size = new Size(140, 32);
            this.btnExportCsv.Text = "Export CSV";
            this.btnExportCsv.UseVisualStyleBackColor = true;
            this.btnExportCsv.Click += new System.EventHandler(this.btnExportCsv_Click);
            //
            // btnPrint
            //
            this.btnPrint.Location = new Point(170, 45);
            this.btnPrint.Name = "btnPrint";
            this.btnPrint.Size = new Size(140, 32);
            this.btnPrint.Text = "Print / Export PDF";
            this.btnPrint.UseVisualStyleBackColor = true;
            this.btnPrint.Click += new System.EventHandler(this.btnPrint_Click);
            //
            // btnClose
            //
            this.btnClose.Location = new Point(320, 45);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new Size(90, 32);
            this.btnClose.Text = "Close";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            //
            // printDocumentReport
            //
            this.printDocumentReport.PrintPage += new PrintPageEventHandler(this.printDocumentReport_PrintPage);
            //
            // frmReports
            //
            this.ClientSize = new Size(1000, 650);
            this.Controls.Add(this.dgvReport);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(1016, 689);
            this.Name = "frmReports";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Reports";
            this.Load += new System.EventHandler(this.frmReports_Load);
            this.pnlTop.ResumeLayout(false);
            this.pnlBottom.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dgvReport)).EndInit();
            this.ResumeLayout(false);
        }
    }
}
