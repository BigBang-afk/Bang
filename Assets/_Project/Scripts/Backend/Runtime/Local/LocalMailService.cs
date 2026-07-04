using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Stores the inbox via ICloudSaveService under a fixed key, same pattern PlayFabMailService uses against real PlayerData.</summary>
    public sealed class LocalMailService : IMailService
    {
        private const string InboxKey = "mail_inbox";

        private readonly ICloudSaveService _cloudSave;
        private readonly IInventoryService _inventory;

        public LocalMailService(ICloudSaveService cloudSave, IInventoryService inventory)
        {
            _cloudSave = cloudSave;
            _inventory = inventory;
        }

        public async Task<GameResult<IReadOnlyList<MailMessage>>> GetInboxAsync()
        {
            List<MailMessage> inbox = await LoadInbox();
            return GameResult<IReadOnlyList<MailMessage>>.Ok(inbox);
        }

        public async Task<GameResult> ClaimMailAsync(string mailId)
        {
            List<MailMessage> inbox = await LoadInbox();
            MailMessage mail = inbox.FirstOrDefault(m => m.MailId == mailId);
            if (mail == null) return GameResult.Fail("Mail not found.");
            if (mail.Claimed) return GameResult.Fail("Mail already claimed.");

            GameResult grant = await _inventory.GrantItemsAsync(mail.Attachments);
            if (!grant.Success) return grant;

            mail.Claimed = true;
            mail.Read = true;
            await _cloudSave.SaveAsync(InboxKey, inbox);
            return GameResult.Successful;
        }

        public async Task<GameResult> DeleteMailAsync(string mailId)
        {
            List<MailMessage> inbox = await LoadInbox();
            inbox.RemoveAll(m => m.MailId == mailId);
            await _cloudSave.SaveAsync(InboxKey, inbox);
            return GameResult.Successful;
        }

        private async Task<List<MailMessage>> LoadInbox()
        {
            GameResult<List<MailMessage>> result = await _cloudSave.LoadAsync<List<MailMessage>>(InboxKey);
            return result.Success ? result.Value : new List<MailMessage>();
        }
    }
}
