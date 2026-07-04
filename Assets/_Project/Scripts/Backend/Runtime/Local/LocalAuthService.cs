using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Always "logs in" successfully and locally — for Practice mode and tests, where there's no server to actually authenticate against.</summary>
    public sealed class LocalAuthService : IAuthService
    {
        public bool IsLoggedIn { get; private set; }
        private PlayerAccountId _accountId;

        public Task<AuthResult> LoginWithDeviceIdAsync(string deviceId)
        {
            _accountId = new PlayerAccountId($"local_{deviceId}");
            IsLoggedIn = true;
            return Task.FromResult(AuthResult.Ok(_accountId, isNewAccount: true, sessionToken: "local-session"));
        }

        public Task<AuthResult> LinkSocialAccountAsync(string provider, string providerToken)
        {
            if (!IsLoggedIn)
                return Task.FromResult(AuthResult.Fail("Must log in before linking a social account."));

            return Task.FromResult(AuthResult.Ok(_accountId, isNewAccount: false, sessionToken: "local-session"));
        }
    }
}
