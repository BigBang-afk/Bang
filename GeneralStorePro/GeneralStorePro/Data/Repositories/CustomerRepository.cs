using System.Collections.Generic;
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
}
