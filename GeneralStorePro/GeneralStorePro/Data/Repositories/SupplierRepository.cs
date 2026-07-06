using System.Collections.Generic;
using Dapper;
using GeneralStorePro.Models;

namespace GeneralStorePro.Data.Repositories;

public static class SupplierRepository
{
    public static IReadOnlyList<Supplier> GetActiveSuppliers()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return connection.Query<Supplier>(
            "SELECT * FROM Suppliers WHERE IsActive = 1 ORDER BY Name;").AsList();
    }

    public static int Insert(Supplier supplier)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return (int)connection.ExecuteScalar<long>(
            """
            INSERT INTO Suppliers (Name, Phone, Address, OpeningBalance, CurrentBalance)
            VALUES (@Name, @Phone, @Address, @OpeningBalance, @OpeningBalance);
            SELECT last_insert_rowid();
            """,
            supplier);
    }

    public static void Update(Supplier supplier)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        connection.Execute(
            """
            UPDATE Suppliers
            SET Name = @Name, Phone = @Phone, Address = @Address
            WHERE Id = @Id;
            """,
            supplier);
    }

    public static void Deactivate(int id)
    {
        using var connection = DbConnectionFactory.CreateConnection();
        connection.Execute("UPDATE Suppliers SET IsActive = 0 WHERE Id = @Id;", new { Id = id });
    }
}
