using System.Security.Cryptography;

namespace ZarghoonJewellers.Common.Security;

/// <summary>
/// Salted PBKDF2-HMACSHA256 password hashing. Deliberately uses only the .NET base class
/// library (no third-party crypto package) so the DataAccess/Business layers have zero
/// extra NuGet surface for something this security-sensitive.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;   // 128-bit salt
    private const int HashSize = 32;   // 256-bit derived key
    public const int DefaultIterations = 100_000;

    /// <summary>Generates a new random salt and derives the PBKDF2 hash for <paramref name="plainPassword"/>.</summary>
    public static (byte[] Hash, byte[] Salt, int Iterations) HashPassword(string plainPassword, int iterations = DefaultIterations)
    {
        if (string.IsNullOrWhiteSpace(plainPassword))
            throw new ArgumentException("Password cannot be empty.", nameof(plainPassword));

        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password: System.Text.Encoding.UTF8.GetBytes(plainPassword),
            salt: salt,
            iterations: iterations,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: HashSize);

        return (hash, salt, iterations);
    }

    /// <summary>Recomputes the hash for <paramref name="plainPassword"/> using the stored salt/iterations
    /// and compares it against <paramref name="storedHash"/> in constant time.</summary>
    public static bool VerifyPassword(string plainPassword, byte[] storedHash, byte[] storedSalt, int iterations)
    {
        if (string.IsNullOrEmpty(plainPassword)) return false;

        byte[] computedHash = Rfc2898DeriveBytes.Pbkdf2(
            password: System.Text.Encoding.UTF8.GetBytes(plainPassword),
            salt: storedSalt,
            iterations: iterations,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: storedHash.Length);

        return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
    }
}
