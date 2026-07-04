using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public interface IMailService
    {
        Task<GameResult<IReadOnlyList<MailMessage>>> GetInboxAsync();

        /// <summary>Marks read, grants attachments via IInventoryService, and marks claimed — all server-side so a client can't claim the same mail twice.</summary>
        Task<GameResult> ClaimMailAsync(string mailId);

        Task<GameResult> DeleteMailAsync(string mailId);
    }
}
