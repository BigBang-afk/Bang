using Dapper;

namespace GeneralStorePro.Data.Repositories;

public static class CustomerPaymentRepository
{
    public static void RecordPayment(int customerId, int userId, decimal amount, string paymentMethod, string? notes)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        connection.Execute(
            """
            INSERT INTO CustomerPayments (CustomerId, Amount, PaymentMethod, UserId, Notes)
            VALUES (@CustomerId, @Amount, @PaymentMethod, @UserId, @Notes);
            """,
            new { CustomerId = customerId, Amount = amount, PaymentMethod = paymentMethod, UserId = userId, Notes = notes },
            transaction);

        connection.Execute(
            "UPDATE Customers SET CurrentBalance = CurrentBalance - @Amount WHERE Id = @CustomerId;",
            new { Amount = amount, CustomerId = customerId },
            transaction);

        if (paymentMethod != "Card")
        {
            var previousBalance = connection.ExecuteScalar<decimal?>(
                "SELECT Balance FROM CashBook ORDER BY Id DESC LIMIT 1;",
                transaction: transaction) ?? 0m;

            connection.Execute(
                """
                INSERT INTO CashBook (TransactionType, Category, ReferenceType, ReferenceId, Amount, Description, Balance, UserId)
                VALUES ('In', 'CustomerPayment', 'Customers', @CustomerId, @Amount, 'Customer payment received', @Balance, @UserId);
                """,
                new { CustomerId = customerId, Amount = amount, Balance = previousBalance + amount, UserId = userId },
                transaction);
        }

        transaction.Commit();
    }
}
