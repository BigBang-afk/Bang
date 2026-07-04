using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalMailServiceTests
    {
        private static async Task<LocalMailService> MakeServiceWithOneMail(LocalInventoryService inventory = null)
        {
            var cloudSave = new LocalCloudSaveService();
            inventory ??= new LocalInventoryService();
            var mail = new LocalMailService(cloudSave, inventory);

            await cloudSave.SaveAsync("mail_inbox", new List<MailMessage>
            {
                new MailMessage
                {
                    MailId = "m1",
                    Title = "Welcome",
                    Body = "Have some gold.",
                    Attachments = new List<InventoryItemStack> { new InventoryItemStack("gold", 500) },
                },
            });

            return mail;
        }

        [Test]
        public async Task GetInbox_ReturnsStoredMail()
        {
            LocalMailService mail = await MakeServiceWithOneMail();
            GameResult<IReadOnlyList<MailMessage>> inbox = await mail.GetInboxAsync();

            Assert.AreEqual(1, inbox.Value.Count);
            Assert.AreEqual("m1", inbox.Value[0].MailId);
        }

        [Test]
        public async Task ClaimMail_GrantsAttachmentsAndMarksClaimed()
        {
            var inventory = new LocalInventoryService();
            LocalMailService mail = await MakeServiceWithOneMail(inventory);

            GameResult result = await mail.ClaimMailAsync("m1");
            Assert.IsTrue(result.Success, result.Error);

            GameResult<IReadOnlyList<InventoryItemStack>> inv = await inventory.GetInventoryAsync();
            Assert.AreEqual(500, inv.Value.Single(i => i.ItemId == "gold").Amount);

            GameResult<IReadOnlyList<MailMessage>> inbox = await mail.GetInboxAsync();
            Assert.IsTrue(inbox.Value.Single(m => m.MailId == "m1").Claimed);
        }

        [Test]
        public async Task ClaimMail_Twice_FailsSecondTime()
        {
            LocalMailService mail = await MakeServiceWithOneMail();
            await mail.ClaimMailAsync("m1");

            GameResult second = await mail.ClaimMailAsync("m1");

            Assert.IsFalse(second.Success);
        }

        [Test]
        public async Task DeleteMail_RemovesItFromInbox()
        {
            LocalMailService mail = await MakeServiceWithOneMail();
            await mail.DeleteMailAsync("m1");

            GameResult<IReadOnlyList<MailMessage>> inbox = await mail.GetInboxAsync();

            Assert.AreEqual(0, inbox.Value.Count);
        }
    }
}
