#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>
    /// Same approach as LocalMailService — PlayFab has no native mail feature, so the inbox
    /// is just another value under ICloudSaveService. Claiming still routes attachment
    /// grants through ICloudFunctionsService so a modified client can't award itself mail
    /// rewards without the server's CloudScript function agreeing the mail exists and is
    /// unclaimed.
    /// </summary>
    public sealed class PlayFabMailService : IMailService
    {
        private const string InboxKey = "mail_inbox";

        private readonly ICloudSaveService _cloudSave;
        private readonly ICloudFunctionsService _cloudFunctions;

        public PlayFabMailService(ICloudSaveService cloudSave, ICloudFunctionsService cloudFunctions)
        {
            _cloudSave = cloudSave;
            _cloudFunctions = cloudFunctions;
        }

        public async Task<GameResult<IReadOnlyList<MailMessage>>> GetInboxAsync()
        {
            GameResult<MailInboxWrapper> result = await _cloudSave.LoadAsync<MailInboxWrapper>(InboxKey);
            IReadOnlyList<MailMessage> inbox = result.Success ? result.Value.messages : new List<MailMessage>();
            return GameResult<IReadOnlyList<MailMessage>>.Ok(inbox);
        }

        public async Task<GameResult> ClaimMailAsync(string mailId)
        {
            GameResult<ClaimAck> result = await _cloudFunctions.ExecuteAsync<string, ClaimAck>("claimMail", mailId);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        public async Task<GameResult> DeleteMailAsync(string mailId)
        {
            GameResult<IReadOnlyList<MailMessage>> inboxResult = await GetInboxAsync();
            if (!inboxResult.Success) return GameResult.Fail(inboxResult.Error);

            var remaining = new MailInboxWrapper { messages = inboxResult.Value.Where(m => m.MailId != mailId).ToList() };
            return await _cloudSave.SaveAsync(InboxKey, remaining);
        }

        [System.Serializable]
        private class MailInboxWrapper
        {
            public List<MailMessage> messages = new List<MailMessage>();
        }

        [System.Serializable]
        private struct ClaimAck
        {
            public bool success;
        }
    }
}
#endif
