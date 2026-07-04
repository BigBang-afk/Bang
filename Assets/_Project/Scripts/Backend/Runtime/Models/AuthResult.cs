using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public readonly struct AuthResult
    {
        public readonly bool Success;
        public readonly PlayerAccountId AccountId;
        public readonly bool IsNewAccount;
        public readonly string SessionToken;
        public readonly string Error;

        private AuthResult(bool success, PlayerAccountId accountId, bool isNewAccount, string sessionToken, string error)
        {
            Success = success;
            AccountId = accountId;
            IsNewAccount = isNewAccount;
            SessionToken = sessionToken;
            Error = error;
        }

        public static AuthResult Ok(PlayerAccountId accountId, bool isNewAccount, string sessionToken) =>
            new AuthResult(true, accountId, isNewAccount, sessionToken, null);

        public static AuthResult Fail(string error) => new AuthResult(false, default, false, null, error);
    }
}
