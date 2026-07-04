using System;
using System.Collections.Generic;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// PlayFab has no built-in "mail" concept — this is modeled as a JSON array stored
    /// under a well-known ICloudSaveService key (see PlayFabMailService), same as any other
    /// piece of player data. Attachments reuse InventoryItemStack so claiming mail is just an
    /// IInventoryService.Grant call.
    /// </summary>
    [Serializable]
    public class MailMessage
    {
        public string MailId;
        public string Title;
        public string Body;
        public string SentAtIso8601;
        public bool Claimed;
        public bool Read;
        public List<InventoryItemStack> Attachments = new List<InventoryItemStack>();
    }
}
