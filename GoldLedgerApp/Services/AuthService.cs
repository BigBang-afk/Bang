using System.Security.Cryptography;
using System.Text;

namespace GoldLedgerApp.Services;

public class AuthService
{
	private const string PinHashKey = "auth_pin_hash";
	private const string PinSaltKey = "auth_pin_salt";

	public bool IsSessionUnlocked { get; set; }

	public async Task<bool> IsPinSetAsync()
	{
		var hash = await SecureStorage.Default.GetAsync(PinHashKey);
		return !string.IsNullOrEmpty(hash);
	}

	public async Task SetPinAsync(string pin)
	{
		var salt = Guid.NewGuid().ToString("N");
		var hash = Hash(pin, salt);

		await SecureStorage.Default.SetAsync(PinSaltKey, salt);
		await SecureStorage.Default.SetAsync(PinHashKey, hash);
	}

	public async Task<bool> VerifyPinAsync(string pin)
	{
		var salt = await SecureStorage.Default.GetAsync(PinSaltKey);
		var storedHash = await SecureStorage.Default.GetAsync(PinHashKey);

		if (string.IsNullOrEmpty(salt) || string.IsNullOrEmpty(storedHash))
			return false;

		return Hash(pin, salt) == storedHash;
	}

	public void ClearSession()
	{
		IsSessionUnlocked = false;
	}

	private static string Hash(string pin, string salt)
	{
		var bytes = Encoding.UTF8.GetBytes(pin + salt);
		var hashBytes = SHA256.HashData(bytes);
		return Convert.ToHexString(hashBytes);
	}
}
