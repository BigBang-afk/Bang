using System.Collections.Generic;
using Dapper;
using GeneralStorePro.Models;

namespace GeneralStorePro.Data.Repositories;

public static class ExpenseRepository
{
    public static IReadOnlyList<Expense> GetAll()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return connection.Query<Expense>(
            "SELECT * FROM Expenses ORDER BY ExpenseDate DESC;").AsList();
    }

    public static void Insert(Expense expense, int userId)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        var expenseId = connection.ExecuteScalar<long>(
            """
            INSERT INTO Expenses (Category, Description, Amount, ExpenseDate, PaymentMethod, UserId)
            VALUES (@Category, @Description, @Amount, @ExpenseDate, @PaymentMethod, @UserId);
            SELECT last_insert_rowid();
            """,
            new
            {
                expense.Category,
                expense.Description,
                expense.Amount,
                expense.ExpenseDate,
                expense.PaymentMethod,
                UserId = userId
            },
            transaction);

        if (expense.PaymentMethod != "Card")
        {
            var previousBalance = connection.ExecuteScalar<decimal?>(
                "SELECT Balance FROM CashBook ORDER BY Id DESC LIMIT 1;",
                transaction: transaction) ?? 0m;

            connection.Execute(
                """
                INSERT INTO CashBook (TransactionType, Category, ReferenceType, ReferenceId, Amount, Description, Balance, UserId)
                VALUES ('Out', 'Expense', 'Expenses', @ExpenseId, @Amount, @Description, @Balance, @UserId);
                """,
                new
                {
                    ExpenseId = expenseId,
                    Amount = expense.Amount,
                    Description = expense.Description ?? expense.Category,
                    Balance = previousBalance - expense.Amount,
                    UserId = userId
                },
                transaction);
        }

        transaction.Commit();
    }

    public static void Delete(int id)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        connection.Execute("DELETE FROM Expenses WHERE Id = @Id;", new { Id = id });
    }
}
