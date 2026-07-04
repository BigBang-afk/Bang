using System.Drawing;
using System.Windows.Forms;

namespace ZarghoonJewelryPro.Forms
{
    partial class frmLogin
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

        private Label lblShopName;
        private Label lblLoginTitle;
        private Label lblUsername;
        private TextBox txtUsername;
        private Label lblPassword;
        private TextBox txtPassword;
        private Button btnLogin;
        private Button btnExit;
        private Label lblMessage;

        private void InitializeComponent()
        {
            this.lblShopName = new Label();
            this.lblLoginTitle = new Label();
            this.lblUsername = new Label();
            this.txtUsername = new TextBox();
            this.lblPassword = new Label();
            this.txtPassword = new TextBox();
            this.btnLogin = new Button();
            this.btnExit = new Button();
            this.lblMessage = new Label();
            this.SuspendLayout();
            //
            // lblShopName
            //
            this.lblShopName.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
            this.lblShopName.ForeColor = Color.FromArgb(153, 101, 21);
            this.lblShopName.Location = new Point(30, 25);
            this.lblShopName.Name = "lblShopName";
            this.lblShopName.Size = new Size(340, 40);
            this.lblShopName.TextAlign = ContentAlignment.MiddleCenter;
            this.lblShopName.Text = "Zarghoon Jewelry Pro";
            //
            // lblLoginTitle
            //
            this.lblLoginTitle.Font = new Font("Segoe UI", 11F, FontStyle.Regular);
            this.lblLoginTitle.ForeColor = Color.DimGray;
            this.lblLoginTitle.Location = new Point(30, 65);
            this.lblLoginTitle.Name = "lblLoginTitle";
            this.lblLoginTitle.Size = new Size(340, 25);
            this.lblLoginTitle.TextAlign = ContentAlignment.MiddleCenter;
            this.lblLoginTitle.Text = "User Login";
            //
            // lblUsername
            //
            this.lblUsername.Location = new Point(40, 115);
            this.lblUsername.Name = "lblUsername";
            this.lblUsername.Size = new Size(90, 23);
            this.lblUsername.Text = "Username:";
            //
            // txtUsername
            //
            this.txtUsername.Location = new Point(140, 112);
            this.txtUsername.Name = "txtUsername";
            this.txtUsername.Size = new Size(200, 23);
            //
            // lblPassword
            //
            this.lblPassword.Location = new Point(40, 155);
            this.lblPassword.Name = "lblPassword";
            this.lblPassword.Size = new Size(90, 23);
            this.lblPassword.Text = "Password:";
            //
            // txtPassword
            //
            this.txtPassword.Location = new Point(140, 152);
            this.txtPassword.Name = "txtPassword";
            this.txtPassword.Size = new Size(200, 23);
            this.txtPassword.UseSystemPasswordChar = true;
            //
            // btnLogin
            //
            this.btnLogin.BackColor = Color.FromArgb(153, 101, 21);
            this.btnLogin.ForeColor = Color.White;
            this.btnLogin.Location = new Point(140, 195);
            this.btnLogin.Name = "btnLogin";
            this.btnLogin.Size = new Size(95, 32);
            this.btnLogin.Text = "Login";
            this.btnLogin.UseVisualStyleBackColor = false;
            this.btnLogin.Click += new System.EventHandler(this.btnLogin_Click);
            //
            // btnExit
            //
            this.btnExit.Location = new Point(245, 195);
            this.btnExit.Name = "btnExit";
            this.btnExit.Size = new Size(95, 32);
            this.btnExit.Text = "Exit";
            this.btnExit.UseVisualStyleBackColor = true;
            this.btnExit.Click += new System.EventHandler(this.btnExit_Click);
            //
            // lblMessage
            //
            this.lblMessage.ForeColor = Color.Red;
            this.lblMessage.Location = new Point(40, 240);
            this.lblMessage.Name = "lblMessage";
            this.lblMessage.Size = new Size(300, 40);
            this.lblMessage.TextAlign = ContentAlignment.MiddleCenter;
            this.lblMessage.Text = "";
            //
            // frmLogin
            //
            this.AcceptButton = this.btnLogin;
            this.CancelButton = this.btnExit;
            this.ClientSize = new Size(400, 300);
            this.Controls.Add(this.lblShopName);
            this.Controls.Add(this.lblLoginTitle);
            this.Controls.Add(this.lblUsername);
            this.Controls.Add(this.txtUsername);
            this.Controls.Add(this.lblPassword);
            this.Controls.Add(this.txtPassword);
            this.Controls.Add(this.btnLogin);
            this.Controls.Add(this.btnExit);
            this.Controls.Add(this.lblMessage);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "frmLogin";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "Zarghoon Jewelry Pro - Login";
            this.ResumeLayout(false);
            this.PerformLayout();
        }
    }
}
