using System.Collections.Generic;
using Dapper;
using GeneralStorePro.Models;

namespace GeneralStorePro.Data.Repositories;

public static class ProductRepository
{
    public static IReadOnlyList<Product> GetActiveProducts()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return connection.Query<Product>(
            "SELECT * FROM Products WHERE IsActive = 1 ORDER BY Name;").AsList();
    }
}
