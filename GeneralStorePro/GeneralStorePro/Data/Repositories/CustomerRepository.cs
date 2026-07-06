using System;
using System.Collections.Generic;
using System.Linq;
using Dapper;
using GeneralStorePro.Models;

namespace GeneralStorePro.Data.Repositories;

public static class CustomerRepository
{
    public static IReadOnlyList<Customer> GetActiveCustomers()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return connection.Query<Customer>(
            "SELECT * FROM Customers WHERE IsActive = 1 ORDER BY Name;").AsList();
    }

    public static int Insert(Customer customer)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return (int)connection.ExecuteScalar<long>(
            """
            INSERT INTO Customers (Name, Phone, Address, CreditLimit, OpeningBalance, CurrentBalance)
            VALUES (@Name, @Phone, @Address, @CreditLimit, @OpeningBalance, @OpeningBalance);
            SELECT last_insert_rowid();
            """,
            customer);
    }

    public static void Update(Customer customer)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        connection.Execute(
            """
            UPDATE Customers
            SET Name = @Name, Phone = @Phone, Address = @Address, CreditLimit = @CreditLimit
            WHERE Id = @Id;
            """,
            customer);
    }

    public static void Deactivate(int id)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        connection.Execute("UPDATE Customers SET IsActive = 0 WHERE Id = @Id;", new { Id = id });
    }

    public static IReadOnlyList<CustomerLedgerEntry> GetLedger(int customerId)
    {
        using var connection = DbConnectionFactory.CreateConnection();

        var customer = connection.QuerySingleOrDefault<Customer>(
            "SELECT * FROM Customers WHERE Id = @Id;", new { Id = customerId });

        if (customer is null)
        {
            return [];
        }

        var sales = connection.Query<RawSaleEntry>(
            """
            SELECT SaleDate, InvoiceNumber, DueAmount
            FROM Sales
            WHERE CustomerId = @CustomerId AND DueAmount > 0;
            """,
            new { CustomerId = customerId }).ToList();

        var payments = connection.Query<RawPaymentEntry>(
            """
            SELECT PaymentDate, Amount
            FROM CustomerPayments
            WHERE CustomerId = @CustomerId;
            """,
            new { CustomerId = customerId }).ToList();

        var events = new List<(DateTime Date, string Type, string Reference, decimal Debit, decimal Credit)>();

        foreach (var sale in sales)
        {
            events.Add((sale.SaleDate, "Credit Sale", sale.InvoiceNumber, sale.DueAmount, 0m));
        }

        foreach (var payment in payments)
        {
            events.Add((payment.PaymentDate, "Payment Received", "Payment", 0m, payment.Amount));
        }

        var ledger = new List<CustomerLedgerEntry>();
        var runningBalance = customer.OpeningBalance;

        if (customer.OpeningBalance != 0)
        {
            ledger.Add(new CustomerLedgerEntry(DateTime.MinValue, "Opening Balance", "-", customer.OpeningBalance, 0m, runningBalance));
        }

        foreach (var entry in events.OrderBy(e => e.Date))
        {
            runningBalance += entry.Debit - entry.Credit;
            ledger.Add(new CustomerLedgerEntry(entry.Date, entry.Type, entry.Reference, entry.Debit, entry.Credit, runningBalance));
        }

        return ledger;
    }

    private sealed class RawSaleEntry
    {
        public DateTime SaleDate { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal DueAmount { get; set; }
    }

    private sealed class RawPaymentEntry
    {
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
    }
}
