using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    public sealed class LocalInventoryService : IInventoryService
    {
        private readonly Dictionary<string, int> _amounts = new Dictionary<string, int>();

        public Task<GameResult<IReadOnlyList<InventoryItemStack>>> GetInventoryAsync()
        {
            IReadOnlyList<InventoryItemStack> stacks = _amounts
                .Where(kvp => kvp.Value > 0)
                .Select(kvp => new InventoryItemStack(kvp.Key, kvp.Value))
                .ToList();
            return Task.FromResult(GameResult<IReadOnlyList<InventoryItemStack>>.Ok(stacks));
        }

        public Task<GameResult> GrantItemsAsync(IReadOnlyList<InventoryItemStack> items)
        {
            foreach (InventoryItemStack item in items)
                _amounts[item.ItemId] = _amounts.GetValueOrDefault(item.ItemId) + item.Amount;
            return Task.FromResult(GameResult.Successful);
        }

        public Task<GameResult> ConsumeItemsAsync(IReadOnlyList<InventoryItemStack> items)
        {
            foreach (InventoryItemStack item in items)
            {
                if (_amounts.GetValueOrDefault(item.ItemId) < item.Amount)
                    return Task.FromResult(GameResult.Fail($"Not enough '{item.ItemId}' (have {_amounts.GetValueOrDefault(item.ItemId)}, need {item.Amount})."));
            }

            foreach (InventoryItemStack item in items)
                _amounts[item.ItemId] -= item.Amount;

            return Task.FromResult(GameResult.Successful);
        }
    }
}
