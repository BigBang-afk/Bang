using System;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// A generic owned-item entry: card copies for upgrade fodder, evolution shards,
    /// cosmetics, or currency — all represented the same way, matching how PlayFab's
    /// inventory model works (opaque item ids + amounts). Economy (Module 6) maps these
    /// item ids to/from game-meaningful concepts like CardId.
    /// </summary>
    [Serializable]
    public struct InventoryItemStack
    {
        public string ItemId;
        public int Amount;

        public InventoryItemStack(string itemId, int amount)
        {
            ItemId = itemId;
            Amount = amount;
        }
    }
}
