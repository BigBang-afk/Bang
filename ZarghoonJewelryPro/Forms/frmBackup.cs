using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmBackup : Form
    {
        public frmBackup()
        {
            InitializeComponent();
        }

        private void AppendLog(string text)
        {
            txtLog.AppendText(DateTime.Now.ToString("HH:mm:ss") + " - " + text + Environment.NewLine + Environment.NewLine);
        }

        private void btnBackupNow_Click(object sender, EventArgs e)
        {
            using (SaveFileDialog dialog = new SaveFileDialog())
            {
                dialog.Filter = "SQL Backup Files (*.sql)|*.sql";
                dialog.FileName = $"zarghoon_jewelry_backup_{DateTime.Now:yyyyMMdd_HHmmss}.sql";

                if (dialog.ShowDialog() != DialogResult.OK)
                {
                    return;
                }

                AppendLog("Starting backup...");

                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = Path.Combine(DbConfig.MySqlBinPath, "mysqldump.exe"),
                        UseShellExecute = false,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };
                    psi.ArgumentList.Add("-u");
                    psi.ArgumentList.Add(DbConfig.UserId);
                    psi.ArgumentList.Add("-h");
                    psi.ArgumentList.Add(DbConfig.Server);
                    psi.ArgumentList.Add("-P");
                    psi.ArgumentList.Add(DbConfig.Port);
                    psi.ArgumentList.Add("--databases");
                    psi.ArgumentList.Add(DbConfig.DatabaseName);
                    psi.ArgumentList.Add("-r");
                    psi.ArgumentList.Add(dialog.FileName);

                    if (!string.IsNullOrEmpty(DbConfig.Password))
                    {
                        psi.EnvironmentVariables["MYSQL_PWD"] = DbConfig.Password;
                    }

                    using (Process process = Process.Start(psi))
                    {
                        string errorOutput = process.StandardError.ReadToEnd();
                        process.WaitForExit();

                        if (process.ExitCode == 0)
                        {
                            BackupTracker.RecordBackupNow();
                            AppendLog("Backup completed successfully:\n" + dialog.FileName);
                            MessageBox.Show("Backup completed successfully.", "Success",
                                MessageBoxButtons.OK, MessageBoxIcon.Information);
                        }
                        else
                        {
                            AppendLog("Backup failed:\n" + errorOutput);
                            MessageBox.Show("Backup failed. See the log below for details.", "Error",
                                MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
                catch (Win32Exception)
                {
                    AppendLog("Could not start mysqldump.exe. Check DbConfig.MySqlBinPath.");
                    MessageBox.Show(
                        "Could not find mysqldump.exe.\n\nCheck that DbConfig.MySqlBinPath points to your " +
                        "MySQL 'bin' folder (e.g. C:\\xampp\\mysql\\bin\\).",
                        "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch (Exception ex)
                {
                    AppendLog("Unexpected error: " + ex.Message);
                    MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        private void btnRestore_Click(object sender, EventArgs e)
        {
            DialogResult confirm = MessageBox.Show(
                "Restoring will overwrite ALL current data in the zarghoon_jewelry database " +
                "with the contents of the backup file.\n\nAre you sure you want to continue?",
                "Confirm Restore", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

            if (confirm != DialogResult.Yes)
            {
                return;
            }

            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Filter = "SQL Backup Files (*.sql)|*.sql";

                if (dialog.ShowDialog() != DialogResult.OK)
                {
                    return;
                }

                AppendLog("Starting restore from:\n" + dialog.FileName);

                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = Path.Combine(DbConfig.MySqlBinPath, "mysql.exe"),
                        UseShellExecute = false,
                        RedirectStandardInput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };
                    psi.ArgumentList.Add("-u");
                    psi.ArgumentList.Add(DbConfig.UserId);
                    psi.ArgumentList.Add("-h");
                    psi.ArgumentList.Add(DbConfig.Server);
                    psi.ArgumentList.Add("-P");
                    psi.ArgumentList.Add(DbConfig.Port);

                    if (!string.IsNullOrEmpty(DbConfig.Password))
                    {
                        psi.EnvironmentVariables["MYSQL_PWD"] = DbConfig.Password;
                    }

                    using (Process process = Process.Start(psi))
                    {
                        string sqlContent = File.ReadAllText(dialog.FileName);
                        process.StandardInput.Write(sqlContent);
                        process.StandardInput.Close();

                        string errorOutput = process.StandardError.ReadToEnd();
                        process.WaitForExit();

                        if (process.ExitCode == 0)
                        {
                            AppendLog("Restore completed successfully from:\n" + dialog.FileName);
                            MessageBox.Show("Restore completed successfully.", "Success",
                                MessageBoxButtons.OK, MessageBoxIcon.Information);
                        }
                        else
                        {
                            AppendLog("Restore failed:\n" + errorOutput);
                            MessageBox.Show("Restore failed. See the log below for details.", "Error",
                                MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
                catch (Win32Exception)
                {
                    AppendLog("Could not start mysql.exe. Check DbConfig.MySqlBinPath.");
                    MessageBox.Show(
                        "Could not find mysql.exe.\n\nCheck that DbConfig.MySqlBinPath points to your " +
                        "MySQL 'bin' folder (e.g. C:\\xampp\\mysql\\bin\\).",
                        "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch (Exception ex)
                {
                    AppendLog("Unexpected error: " + ex.Message);
                    MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
