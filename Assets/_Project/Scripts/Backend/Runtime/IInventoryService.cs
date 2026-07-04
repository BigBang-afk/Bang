using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public interface IInventoryService
    {
        Task<GameResult<IReadOnlyList<InventoryItemStack>>> GetInventoryAsync();

        /// <summary>Server-authoritative grant (chest rewards, mail claims, IAP fulfillment) — never called to fulfil a purchase the client itself decided the price/outcome of.</summary>
        Task<GameResult> GrantItemsAsync(IReadOnlyList<InventoryItemStack> items);

        /// <summary>Fails with an error rather than going negative if the player doesn't have enough (e.g. spending card copies on an upgrade).</summary>
        Task<GameResult> ConsumeItemsAsync(IReadOnlyList<InventoryItemStack> items);
    }
}
