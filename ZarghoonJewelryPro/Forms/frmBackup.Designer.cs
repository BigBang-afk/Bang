using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmBackup
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
        private Label lblInfo;
        private Button btnBackupNow;
        private Button btnRestore;

        private TextBox txtLog;

        private Panel pnlBottom;
        private Button btnClose;

        private void InitializeComponent()
        {
            this.pnlTop = new Panel();
            this.lblFormTitle = new Label();
            this.lblInfo = new Label();
            this.btnBackupNow = new Button();
            this.btnRestore = new Button();

            this.txtLog = new TextBox();

            this.pnlBottom = new Panel();
            this.btnClose = new Button();

            this.pnlTop.SuspendLayout();
            this.pnlBottom.SuspendLayout();
            this.SuspendLayout();
            //
            // pnlTop
            //
            this.pnlTop.Controls.Add(this.lblFormTitle);
            this.pnlTop.Controls.Add(this.lblInfo);
            this.pnlTop.Controls.Add(this.btnBackupNow);
            this.pnlTop.Controls.Add(this.btnRestore);
            this.pnlTop.Dock = DockStyle.Top;
            this.pnlTop.Location = new Point(0, 0);
            this.pnlTop.Name = "pnlTop";
            this.pnlTop.Size = new Size(900, 150);
            //
            // lblFormTitle
            //
            this.lblFormTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            this.lblFormTitle.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblFormTitle.Location = new Point(20, 15);
            this.lblFormTitle.Name = "lblFormTitle";
            this.lblFormTitle.Size = new Size(300, 30);
            this.lblFormTitle.Text = "Backup && Restore";
            //
            // lblInfo
            //
            this.lblInfo.Location = new Point(20, 55);
            this.lblInfo.Name = "lblInfo";
            this.lblInfo.Size = new Size(850, 40);
            this.lblInfo.Text = "Backup Now saves your entire database to a .sql file you choose. Restore from " +
                "File replaces ALL current data with the contents of a backup file.";
            //
            // btnBackupNow
            //
            this.btnBackupNow.BackColor = Color.FromArgb(153, 101, 21);
            this.btnBackupNow.ForeColor = Color.White;
            this.btnBackupNow.Location = new Point(20, 100);
            this.btnBackupNow.Name = "btnBackupNow";
            this.btnBackupNow.Size = new Size(160, 35);
            this.btnBackupNow.Text = "Backup Now";
            this.btnBackupNow.UseVisualStyleBackColor = false;
            this.btnBackupNow.Click += new System.EventHandler(this.btnBackupNow_Click);
            //
            // btnRestore
            //
            this.btnRestore.Location = new Point(200, 100);
            this.btnRestore.Name = "btnRestore";
            this.btnRestore.Size = new Size(160, 35);
            this.btnRestore.Text = "Restore from File";
            this.btnRestore.UseVisualStyleBackColor = true;
            this.btnRestore.Click += new System.EventHandler(this.btnRestore_Click);
            //
            // txtLog
            //
            this.txtLog.Dock = DockStyle.Fill;
            this.txtLog.Font = new Font("Consolas", 9F);
            this.txtLog.Location = new Point(0, 150);
            this.txtLog.Multiline = true;
            this.txtLog.Name = "txtLog";
            this.txtLog.ReadOnly = true;
            this.txtLog.ScrollBars = ScrollBars.Vertical;
            this.txtLog.Size = new Size(900, 395);
            //
            // pnlBottom
            //
            this.pnlBottom.Controls.Add(this.btnClose);
            this.pnlBottom.Dock = DockStyle.Bottom;
            this.pnlBottom.Location = new Point(0, 545);
            this.pnlBottom.Name = "pnlBottom";
            this.pnlBottom.Size = new Size(900, 55);
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
            // frmBackup
            //
            this.ClientSize = new Size(900, 600);
            this.Controls.Add(this.txtLog);
            this.Controls.Add(this.pnlBottom);
            this.Controls.Add(this.pnlTop);
            this.MinimumSize = new Size(916, 639);
            this.Name = "frmBackup";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Backup && Restore";
            this.pnlTop.ResumeLayout(false);
            this.pnlBottom.ResumeLayout(false);
            this.ResumeLayout(false);
        }
    }
}
