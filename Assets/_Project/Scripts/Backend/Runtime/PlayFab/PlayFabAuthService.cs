#if ROYALECLASH_PLAYFAB
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    public sealed class PlayFabAuthService : IAuthService
    {
        public bool IsLoggedIn { get; private set; }

        public async Task<AuthResult> LoginWithDeviceIdAsync(string deviceId)
        {
            var request = new LoginWithCustomIDRequest
            {
                CustomId = deviceId,
                CreateAccount = true,
            };

            PlayFabResult<LoginResult> result = await PlayFabClientAPI.LoginWithCustomIDAsync(request);
            if (result.Error != null)
                return AuthResult.Fail(result.Error.ErrorMessage);

            IsLoggedIn = true;
            return AuthResult.Ok(new PlayerAccountId(result.Result.PlayFabId), result.Result.NewlyCreated, result.Result.SessionTicket);
        }

        public Task<AuthResult> LinkSocialAccountAsync(string provider, string providerToken)
        {
            // NOTE: PlayFab has a distinct Link*Account request type per provider (e.g.
            // LinkGoogleAccountRequest, LinkAppleAccountRequest) rather than one generic call —
            // this is a placeholder; wire in the real request type once the specific providers
            // this game supports (Google Play Games, Game Center, etc.) are decided, most
            // likely in Module 7 alongside the account-linking UI.
            return Task.FromResult(AuthResult.Fail($"Unsupported social provider '{provider}' — add its Link*Request call here."));
        }
    }
}
#endif
