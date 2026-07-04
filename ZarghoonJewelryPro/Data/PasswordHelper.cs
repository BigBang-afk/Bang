using System.Security.Cryptography;
using System.Text;

namespace ZarghoonJewelryPro.Data
{
    /// <summary>
    /// Converts plain-text passwords to a SHA-256 hash so passwords are
    /// never stored or compared as plain text in the database.
    /// </summary>
    public static class PasswordHelper
    {
        public static string HashPassword(string plainText)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(plainText));
                StringBuilder builder = new StringBuilder();
                foreach (byte b in bytes)
                {
                    builder.Append(b.ToString("x2"));
                }
                return builder.ToString();
            }
        }
    }
}
