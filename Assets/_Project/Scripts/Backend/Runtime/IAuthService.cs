using System.Threading.Tasks;

namespace RoyaleClash.Backend
{
    public interface IAuthService
    {
        /// <summary>Logs in with a stable per-device id, creating an account on first launch. The common path for a mobile game — no separate signup screen required.</summary>
        Task<AuthResult> LoginWithDeviceIdAsync(string deviceId);

        /// <summary>Links a social identity (Google Play Games / Game Center / etc.) to the already-logged-in account, so progress survives a device change.</summary>
        Task<AuthResult> LinkSocialAccountAsync(string provider, string providerToken);

        bool IsLoggedIn { get; }
    }
}
