using Dapper;
using GeneralStorePro.Data;
using GeneralStorePro.Helpers;
using GeneralStorePro.Models;

namespace GeneralStorePro.Services;

public static class AuthService
{
    public static User? ValidateCredentials(string username, string password)
    {
        using var connection = DbConnectionFactory.CreateConnection();

        var user = connection.QueryFirstOrDefault<User>(
            "SELECT * FROM Users WHERE Username = @Username AND IsActive = 1;",
            new { Username = username });

        if (user is null || !PasswordHasher.Verify(password, user.PasswordHash))
        {
            return null;
        }

        connection.Execute(
            "UPDATE Users SET LastLoginAt = datetime('now', 'localtime') WHERE Id = @Id;",
            new { user.Id });

        return user;
    }
}
