namespace ZarghoonJewellers.App.Models
{
    public class AppSettings
    {
        public string ShopName { get; set; } = "ZARGHOON JEWELLERS";
        public string ShopAddress { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string ReportHeader { get; set; } = "Zarghoon Jewellers - Account & Ledger Report";
        public string ReportFooter { get; set; } = "Thank you for your business.";
    }
}
