using Microsoft.AspNetCore.DataProtection;

namespace FlexXSignal.Infrastructure.Security;

/// <summary>Encrypts market-data-provider API keys at rest using ASP.NET Core Data Protection.
/// Keys are never written to logs; only this class ever sees plaintext outside of the admin request itself.</summary>
public interface IApiKeyProtector
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}

public sealed class ApiKeyProtector : IApiKeyProtector
{
    private readonly IDataProtector _protector;

    public ApiKeyProtector(IDataProtectionProvider provider) => _protector = provider.CreateProtector("FlexXSignal.MarketDataProviderApiKey");

    public string Encrypt(string plainText) => _protector.Protect(plainText);
    public string Decrypt(string cipherText) => _protector.Unprotect(cipherText);
}
