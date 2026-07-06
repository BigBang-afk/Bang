using System;
using System.Collections.Generic;
using Dapper;
using Microsoft.Data.Sqlite;

namespace GeneralStorePro.Data.Repositories;

public sealed record SaleItemInput(int ProductId, string ProductName, double Quantity, decimal UnitPrice, decimal LineTotal);

public sealed class InsufficientStockException(string productName, double available)
    : Exception($"Not enough stock for '{productName}'. Only {available} available.")
{
}

public static class SaleRepository
{
    public static string CreateSale(
        int? customerId,
        int userId,
        IReadOnlyList<SaleItemInput> items,
        decimal subTotal,
        decimal discountAmount,
        decimal taxAmount,
        decimal totalAmount,
        decimal paidAmount,
        decimal dueAmount,
        string paymentMethod)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        foreach (var item in items)
        {
            var currentStock = connection.ExecuteScalar<double>(
                "SELECT StockQuantity FROM Products WHERE Id = @ProductId;",
                new { item.ProductId },
                transaction);

            if (currentStock < item.Quantity)
            {
                transaction.Rollback();
                throw new InsufficientStockException(item.ProductName, currentStock);
            }
        }

        var invoiceNumber = ReserveNextInvoiceNumber(connection, transaction);

        var saleId = connection.ExecuteScalar<long>(
            """
            INSERT INTO Sales (InvoiceNumber, CustomerId, UserId, SubTotal, DiscountAmount, TaxAmount, TotalAmount, PaidAmount, DueAmount, PaymentMethod, Status)
            VALUES (@InvoiceNumber, @CustomerId, @UserId, @SubTotal, @DiscountAmount, @TaxAmount, @TotalAmount, @PaidAmount, @DueAmount, @PaymentMethod, 'Completed');
            SELECT last_insert_rowid();
            """,
            new
            {
                InvoiceNumber = invoiceNumber,
                CustomerId = customerId,
                UserId = userId,
                SubTotal = subTotal,
                DiscountAmount = discountAmount,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                DueAmount = dueAmount,
                PaymentMethod = paymentMethod
            },
            transaction);

        foreach (var item in items)
        {
            connection.Execute(
                """
                INSERT INTO SaleItems (SaleId, ProductId, Quantity, UnitPrice, TotalPrice)
                VALUES (@SaleId, @ProductId, @Quantity, @UnitPrice, @TotalPrice);
                """,
                new { SaleId = saleId, item.ProductId, item.Quantity, item.UnitPrice, TotalPrice = item.LineTotal },
                transaction);

            connection.Execute(
                """
                UPDATE Products
                SET StockQuantity = StockQuantity - @Quantity, UpdatedAt = datetime('now', 'localtime')
                WHERE Id = @ProductId;
                """,
                new { item.Quantity, item.ProductId },
                transaction);
        }

        if (customerId is not null && dueAmount > 0)
        {
            connection.Execute(
                "UPDATE Customers SET CurrentBalance = CurrentBalance + @DueAmount WHERE Id = @CustomerId;",
                new { DueAmount = dueAmount, CustomerId = customerId },
                transaction);
        }

        if (paymentMethod != "Card" && paidAmount > 0)
        {
            var previousBalance = connection.ExecuteScalar<decimal?>(
                "SELECT Balance FROM CashBook ORDER BY Id DESC LIMIT 1;",
                transaction: transaction) ?? 0m;

            connection.Execute(
                """
                INSERT INTO CashBook (TransactionType, Category, ReferenceType, ReferenceId, Amount, Description, Balance, UserId)
                VALUES ('In', 'Sale', 'Sales', @SaleId, @Amount, @Description, @Balance, @UserId);
                """,
                new
                {
                    SaleId = saleId,
                    Amount = paidAmount,
                    Description = $"Sale {invoiceNumber}",
                    Balance = previousBalance + paidAmount,
                    UserId = userId
                },
                transaction);
        }

        transaction.Commit();

        return invoiceNumber;
    }

    private static string ReserveNextInvoiceNumber(SqliteConnection connection, SqliteTransaction transaction)
    {
        var prefix = connection.ExecuteScalar<string?>(
            "SELECT SettingValue FROM Settings WHERE SettingKey = 'InvoicePrefix';",
            transaction: transaction) ?? "INV-";

        var nextRaw = connection.ExecuteScalar<string?>(
            "SELECT SettingValue FROM Settings WHERE SettingKey = 'NextInvoiceNumber';",
            transaction: transaction);

        var nextNumber = nextRaw is null ? 1 : int.Parse(nextRaw);

        connection.Execute(
            nextRaw is null
                ? "INSERT INTO Settings (SettingKey, SettingValue) VALUES ('NextInvoiceNumber', @Next);"
                : "UPDATE Settings SET SettingValue = @Next WHERE SettingKey = 'NextInvoiceNumber';",
            new { Next = (nextNumber + 1).ToString() },
            transaction);

        return $"{prefix}{nextNumber:D5}";
    }
}
