using System;
using System.Windows.Forms;
using ZarghoonJewelryPro.Forms;

namespace ZarghoonJewelryPro
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Application.Run(new frmLogin());
        }
    }
}
