using System;
using System.Data;
using System.Drawing;
using System.Drawing.Printing;
using System.Globalization;
using System.IO;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using ZarghoonJewelryPro.Data;

namespace ZarghoonJewelryPro.Forms
{
    public partial class frmReports : Form
    {
        private const string ReportSales = "Sales";
        private const string ReportCash = "Cash In / Out";
        private const string ReportRepairs = "Repairs";
        private const string ReportCustomerLedger = "Customer Ledger";

        public frmReports()
        {
            InitializeComponent();
        }

        private void frmReports_Load(object sender, EventArgs e)
        {
            cboReportType.Items.Clear();
            cboReportType.Items.AddRange(new object[] { ReportSales, ReportCash, ReportRepairs, ReportCustomerLedger });
            cboReportType.SelectedIndex = 0;

            dtpFromDate.Value = DateTime.Today;
            dtpToDate.Value = DateTime.Today;

            LoadCustomers();
        }

        private void LoadCustomers()
        {
            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();
                    string query = "SELECT CustomerID, CustomerName FROM customers ORDER BY CustomerName";
                    using (MySqlCommand cmd = new MySqlCommand(query, conn))
                    using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                    {
                        DataTable table = new DataTable();
                        adapter.Fill(table);
                        cboCustomer.DataSource = table;
                        cboCustomer.DisplayMember = "CustomerName";
                        cboCustomer.ValueMember = "CustomerID";
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void cboReportType_SelectedIndexChanged(object sender, EventArgs e)
        {
            bool isLedger = cboReportType.Text == ReportCustomerLedger;
            lblCustomerCaption.Visible = isLedger;
            cboCustomer.Visible = isLedger;
        }

        private void btnGenerate_Click(object sender, EventArgs e)
        {
            string reportType = cboReportType.Text;
            DateTime fromDate = dtpFromDate.Value.Date;
            DateTime toDate = dtpToDate.Value.Date;

            if (reportType == ReportCustomerLedger && cboCustomer.SelectedValue == null)
            {
                MessageBox.Show("Please select a customer, or add one from the Customers form first.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                using (MySqlConnection conn = DatabaseHelper.GetConnection())
                {
                    conn.Open();

                    switch (reportType)
                    {
                        case ReportSales:
                            GenerateSalesReport(conn, fromDate, toDate);
                            break;
                        case ReportCash:
                            GenerateCashReport(conn, fromDate, toDate);
                            break;
                        case ReportRepairs:
                            GenerateRepairsReport(conn, fromDate, toDate);
                            break;
                        case ReportCustomerLedger:
                            GenerateCustomerLedgerReport(conn, fromDate, toDate);
                            break;
                    }
                }
            }
            catch (MySqlException ex)
            {
                MessageBox.Show(DatabaseHelper.GetFriendlyErrorMessage(ex), "Database Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unexpected error: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void GenerateSalesReport(MySqlConnection conn, DateTime fromDate, DateTime toDate)
        {
            string query =
                "SELECT s.InvoiceNumber AS 'Invoice #', COALESCE(c.CustomerName, 'Walk-in Customer') AS 'Customer', " +
                "s.SaleDate AS 'Date', s.TotalAmount AS 'Total', s.ReceivedAmount AS 'Received', s.BalanceAmount AS 'Balance' " +
                "FROM sales s LEFT JOIN customers c ON s.CustomerID = c.CustomerID " +
                "WHERE DATE(s.SaleDate) BETWEEN @From AND @To ORDER BY s.SaleDate";

            using (MySqlCommand cmd = new MySqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@From", fromDate);
                cmd.Parameters.AddWithValue("@To", toDate);
                using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                {
                    DataTable table = new DataTable();
                    adapter.Fill(table);
                    dgvReport.DataSource = table;

                    decimal totalSales = SumColumn(table, "Total");
                    lblSummary.Text = $"{table.Rows.Count} sale(s) — Total: {totalSales:N2}";
                }
            }
        }

        private void GenerateCashReport(MySqlConnection conn, DateTime fromDate, DateTime toDate)
        {
            string query =
                "SELECT TransactionType AS 'Type', Category AS 'Category', Amount AS 'Amount', " +
                "Description AS 'Description', TransactionDate AS 'Date' " +
                "FROM cash_transactions WHERE DATE(TransactionDate) BETWEEN @From AND @To ORDER BY TransactionDate";

            using (MySqlCommand cmd = new MySqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@From", fromDate);
                cmd.Parameters.AddWithValue("@To", toDate);
                using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                {
                    DataTable table = new DataTable();
                    adapter.Fill(table);
                    dgvReport.DataSource = table;

                    decimal totalIn = 0;
                    decimal totalOut = 0;
                    foreach (DataRow row in table.Rows)
                    {
                        decimal amount = Convert.ToDecimal(row["Amount"]);
                        if (row["Type"].ToString() == "In") totalIn += amount;
                        else totalOut += amount;
                    }

                    lblSummary.Text = $"{table.Rows.Count} transaction(s) — In: {totalIn:N2}  Out: {totalOut:N2}  Net: {(totalIn - totalOut):N2}";
                }
            }
        }

        private void GenerateRepairsReport(MySqlConnection conn, DateTime fromDate, DateTime toDate)
        {
            string query =
                "SELECT ReceiptNumber AS 'Receipt #', CustomerName AS 'Customer', ItemDescription AS 'Item', " +
                "Status AS 'Status', EstimatedCost AS 'Est. Cost', AdvancePaid AS 'Advance', ReceivedDate AS 'Received' " +
                "FROM repairs WHERE DATE(ReceivedDate) BETWEEN @From AND @To ORDER BY ReceivedDate";

            using (MySqlCommand cmd = new MySqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@From", fromDate);
                cmd.Parameters.AddWithValue("@To", toDate);
                using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                {
                    DataTable table = new DataTable();
                    adapter.Fill(table);
                    dgvReport.DataSource = table;

                    decimal totalEstimated = SumColumn(table, "Est. Cost");
                    lblSummary.Text = $"{table.Rows.Count} repair(s) — Total Estimated Cost: {totalEstimated:N2}";
                }
            }
        }

        private void GenerateCustomerLedgerReport(MySqlConnection conn, DateTime fromDate, DateTime toDate)
        {
            int customerId = Convert.ToInt32(cboCustomer.SelectedValue);

            string query =
                "SELECT InvoiceNumber AS 'Invoice #', SaleDate AS 'Date', TotalAmount AS 'Total', " +
                "ReceivedAmount AS 'Received', BalanceAmount AS 'Balance' " +
                "FROM sales WHERE CustomerID = @CustomerID AND DATE(SaleDate) BETWEEN @From AND @To ORDER BY SaleDate";

            using (MySqlCommand cmd = new MySqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@CustomerID", customerId);
                cmd.Parameters.AddWithValue("@From", fromDate);
                cmd.Parameters.AddWithValue("@To", toDate);
                using (MySqlDataAdapter adapter = new MySqlDataAdapter(cmd))
                {
                    DataTable table = new DataTable();
                    adapter.Fill(table);
                    dgvReport.DataSource = table;

                    decimal totalBalance = SumColumn(table, "Balance");
                    lblSummary.Text = $"{table.Rows.Count} invoice(s) for {cboCustomer.Text} — Outstanding Balance: {totalBalance:N2}";
                }
            }
        }

        private decimal SumColumn(DataTable table, string columnName)
        {
            decimal sum = 0;
            foreach (DataRow row in table.Rows)
            {
                sum += Convert.ToDecimal(row[columnName]);
            }
            return sum;
        }

        private void btnExportCsv_Click(object sender, EventArgs e)
        {
            if (dgvReport.Columns.Count == 0 || dgvReport.Rows.Count == 0)
            {
                MessageBox.Show("Nothing to export. Generate a report first.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            using (SaveFileDialog dialog = new SaveFileDialog())
            {
                dialog.Filter = "CSV files (*.csv)|*.csv";
                dialog.FileName = $"{cboReportType.Text.Replace(" ", "_")}_Report_{DateTime.Now:yyyyMMdd_HHmmss}.csv";

                if (dialog.ShowDialog() != DialogResult.OK)
                {
                    return;
                }

                try
                {
                    using (StreamWriter writer = new StreamWriter(dialog.FileName))
                    {
                        string[] headers = new string[dgvReport.Columns.Count];
                        for (int i = 0; i < dgvReport.Columns.Count; i++)
                        {
                            headers[i] = EscapeCsv(dgvReport.Columns[i].HeaderText);
                        }
                        writer.WriteLine(string.Join(",", headers));

                        foreach (DataGridViewRow row in dgvReport.Rows)
                        {
                            string[] fields = new string[dgvReport.Columns.Count];
                            for (int i = 0; i < dgvReport.Columns.Count; i++)
                            {
                                fields[i] = EscapeCsv(row.Cells[i].Value?.ToString() ?? "");
                            }
                            writer.WriteLine(string.Join(",", fields));
                        }
                    }

                    MessageBox.Show("Report exported to:\n" + dialog.FileName + "\n\nThis file opens directly in Excel.",
                        "Export Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Could not export the report: " + ex.Message, "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        private string EscapeCsv(string value)
        {
            if (value.Contains(",") || value.Contains("\"") || value.Contains("\n"))
            {
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            }
            return value;
        }

        private void btnPrint_Click(object sender, EventArgs e)
        {
            if (dgvReport.Rows.Count == 0)
            {
                MessageBox.Show("Generate a report first.", "Validation",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                using (PrintDialog printDialog = new PrintDialog())
                {
                    printDialog.Document = printDocumentReport;
                    if (printDialog.ShowDialog() == DialogResult.OK)
                    {
                        printDocumentReport.Print();
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Printing failed: " + ex.Message, "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void printDocumentReport_PrintPage(object sender, PrintPageEventArgs e)
        {
            Graphics g = e.Graphics;
            Font titleFont = new Font("Segoe UI", 14F, FontStyle.Bold);
            Font headerFont = new Font("Segoe UI", 9F, FontStyle.Bold);
            Font normalFont = new Font("Segoe UI", 9F);

            int x = e.MarginBounds.Left;
            int y = e.MarginBounds.Top;
            int width = e.MarginBounds.Width;

            g.DrawString($"{ShopInfo.ShopName} - {cboReportType.Text} Report", titleFont, Brushes.Black, x, y);
            y += 25;
            g.DrawString("Generated: " + DateTime.Now.ToString("dd MMM yyyy  hh:mm tt", CultureInfo.InvariantCulture),
                normalFont, Brushes.Black, x, y);
            y += 25;

            int columnCount = dgvReport.Columns.Count;
            int columnWidth = width / columnCount;

            for (int i = 0; i < columnCount; i++)
            {
                g.DrawString(dgvReport.Columns[i].HeaderText, headerFont, Brushes.Black, x + (i * columnWidth), y);
            }
            y += 20;
            g.DrawLine(Pens.Black, x, y, x + width, y);
            y += 5;

            foreach (DataGridViewRow row in dgvReport.Rows)
            {
                y += 18;
                for (int i = 0; i < columnCount; i++)
                {
                    string text = row.Cells[i].Value?.ToString() ?? "";
                    g.DrawString(text, normalFont, Brushes.Black, x + (i * columnWidth), y);
                }
            }

            y += 25;
            g.DrawString(lblSummary.Text, headerFont, Brushes.Black, x, y);

            e.HasMorePages = false;
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}
