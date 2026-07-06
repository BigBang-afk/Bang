using System;
using System.IO;
using System.Reflection;
using GeneralStorePro.Helpers;
using Microsoft.Data.Sqlite;

namespace GeneralStorePro.Data;

/// <summary>
/// Creates the SQLite database file (if missing), applies the schema and seeds first-run data.
/// Safe to call every application startup.
/// </summary>
public static class DatabaseInitializer
{
    private static readonly string DatabaseDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "GeneralStorePro");

    public static string DatabasePath => Path.Combine(DatabaseDirectory, "store.db");

    public static string ConnectionString => $"Data Source={DatabasePath}";

    public static void Initialize()
    {
        Directory.CreateDirectory(DatabaseDirectory);

        using var connection = new SqliteConnection(ConnectionString);
        connection.Open();

        using (var pragma = connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = ON;";
            pragma.ExecuteNonQuery();
        }

        using (var schema = connection.CreateCommand())
        {
            schema.CommandText = LoadSchemaScript();
            schema.ExecuteNonQuery();
        }

        SeedDefaultData(connection);
    }

    private static string LoadSchemaScript()
    {
        const string resourceName = "GeneralStorePro.Data.Schema.sql";
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{resourceName}' was not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static void SeedDefaultData(SqliteConnection connection)
    {
        using (var checkUsers = connection.CreateCommand())
        {
            checkUsers.CommandText = "SELECT COUNT(*) FROM Users;";
            var userCount = (long)checkUsers.ExecuteScalar()!;

            if (userCount == 0)
            {
                using var seedAdmin = connection.CreateCommand();
                seedAdmin.CommandText = """
                    INSERT INTO Users (Username, PasswordHash, FullName, Role)
                    VALUES ($username, $passwordHash, $fullName, $role);
                    """;
                seedAdmin.Parameters.AddWithValue("$username", "admin");
                seedAdmin.Parameters.AddWithValue("$passwordHash", PasswordHasher.Hash("admin123"));
                seedAdmin.Parameters.AddWithValue("$fullName", "Administrator");
                seedAdmin.Parameters.AddWithValue("$role", "Admin");
                seedAdmin.ExecuteNonQuery();
            }
        }

        using (var checkSettings = connection.CreateCommand())
        {
            checkSettings.CommandText = "SELECT COUNT(*) FROM Settings;";
            var settingsCount = (long)checkSettings.ExecuteScalar()!;

            if (settingsCount == 0)
            {
                (string Key, string Value)[] defaults =
                [
                    ("StoreName", "My General Store"),
                    ("StoreAddress", ""),
                    ("StorePhone", ""),
                    ("CurrencySymbol", "$"),
                    ("TaxRatePercent", "0"),
                    ("InvoicePrefix", "INV-"),
                    ("PurchasePrefix", "PUR-"),
                    ("LowStockThreshold", "5"),
                    ("LastBackupDate", ""),
                    ("NextInvoiceNumber", "1")
                ];

                foreach (var (key, value) in defaults)
                {
                    using var seedSetting = connection.CreateCommand();
                    seedSetting.CommandText = "INSERT INTO Settings (SettingKey, SettingValue) VALUES ($key, $value);";
                    seedSetting.Parameters.AddWithValue("$key", key);
                    seedSetting.Parameters.AddWithValue("$value", value);
                    seedSetting.ExecuteNonQuery();
                }
            }
        }

        using (var checkProducts = connection.CreateCommand())
        {
            checkProducts.CommandText = "SELECT COUNT(*) FROM Products;";
            var productCount = (long)checkProducts.ExecuteScalar()!;

            if (productCount == 0)
            {
                (string Name, string Sku, string Unit, decimal PurchasePrice, decimal SalePrice, double Stock, double ReorderLevel)[] products =
                [
                    ("Rice 5kg", "SKU-1001", "bag", 9.00m, 12.50m, 42, 10),
                    ("Cooking Oil 1L", "SKU-1002", "bottle", 2.60m, 3.75m, 15, 15),
                    ("Sugar 1kg", "SKU-1003", "pack", 0.85m, 1.20m, 3, 10),
                    ("Wheat Flour 2kg", "SKU-1004", "bag", 2.10m, 2.90m, 26, 8),
                    ("Tea Pack 500g", "SKU-1005", "pack", 2.90m, 4.10m, 18, 6),
                    ("Salt 1kg", "SKU-1006", "pack", 0.40m, 0.60m, 50, 10),
                    ("Detergent 1kg", "SKU-1007", "pack", 2.30m, 3.30m, 22, 8),
                    ("Milk Powder 400g", "SKU-1008", "tin", 5.10m, 6.75m, 12, 6)
                ];

                foreach (var product in products)
                {
                    using var seedProduct = connection.CreateCommand();
                    seedProduct.CommandText = """
                        INSERT INTO Products (Name, SKU, Unit, PurchasePrice, SalePrice, StockQuantity, ReorderLevel)
                        VALUES ($name, $sku, $unit, $purchasePrice, $salePrice, $stock, $reorderLevel);
                        """;
                    seedProduct.Parameters.AddWithValue("$name", product.Name);
                    seedProduct.Parameters.AddWithValue("$sku", product.Sku);
                    seedProduct.Parameters.AddWithValue("$unit", product.Unit);
                    seedProduct.Parameters.AddWithValue("$purchasePrice", product.PurchasePrice);
                    seedProduct.Parameters.AddWithValue("$salePrice", product.SalePrice);
                    seedProduct.Parameters.AddWithValue("$stock", product.Stock);
                    seedProduct.Parameters.AddWithValue("$reorderLevel", product.ReorderLevel);
                    seedProduct.ExecuteNonQuery();
                }
            }
        }

        using (var checkCustomers = connection.CreateCommand())
        {
            checkCustomers.CommandText = "SELECT COUNT(*) FROM Customers;";
            var customerCount = (long)checkCustomers.ExecuteScalar()!;

            if (customerCount == 0)
            {
                (string Name, string Phone, string Address, decimal CreditLimit)[] customers =
                [
                    ("Aarav Traders", "555-0101", "12 Market Street", 5000m),
                    ("Meera Kirana Shop", "555-0102", "48 Station Road", 3000m),
                    ("Rohan Fashions", "555-0103", "9 Mill Lane", 2000m)
                ];

                foreach (var customer in customers)
                {
                    using var seedCustomer = connection.CreateCommand();
                    seedCustomer.CommandText = """
                        INSERT INTO Customers (Name, Phone, Address, CreditLimit)
                        VALUES ($name, $phone, $address, $creditLimit);
                        """;
                    seedCustomer.Parameters.AddWithValue("$name", customer.Name);
                    seedCustomer.Parameters.AddWithValue("$phone", customer.Phone);
                    seedCustomer.Parameters.AddWithValue("$address", customer.Address);
                    seedCustomer.Parameters.AddWithValue("$creditLimit", customer.CreditLimit);
                    seedCustomer.ExecuteNonQuery();
                }
            }
        }
    }
}
