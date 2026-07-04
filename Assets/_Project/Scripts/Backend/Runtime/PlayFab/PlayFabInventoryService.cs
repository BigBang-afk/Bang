#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>
    /// Reads are a direct client call (harmless); grants/consumes route through CloudScript
    /// (via <see cref="ICloudFunctionsService"/>) because PlayFab's client API intentionally
    /// has no "grant myself items" endpoint — economy mutations must be server-validated.
    /// </summary>
    public sealed class PlayFabInventoryService : IInventoryService
    {
        private readonly ICloudFunctionsService _cloudFunctions;

        public PlayFabInventoryService(ICloudFunctionsService cloudFunctions) => _cloudFunctions = cloudFunctions;

        public async Task<GameResult<IReadOnlyList<InventoryItemStack>>> GetInventoryAsync()
        {
            PlayFabResult<GetUserInventoryResult> result = await PlayFabClientAPI.GetUserInventoryAsync(new GetUserInventoryRequest());
            if (result.Error != null)
                return GameResult<IReadOnlyList<InventoryItemStack>>.Fail(result.Error.ErrorMessage);

            IReadOnlyList<InventoryItemStack> stacks = result.Result.Inventory
                .GroupBy(item => item.ItemId)
                .Select(group => new InventoryItemStack(group.Key, group.Count()))
                .Concat(result.Result.VirtualCurrency.Select(kvp => new InventoryItemStack(kvp.Key, kvp.Value)))
                .ToList();

            return GameResult<IReadOnlyList<InventoryItemStack>>.Ok(stacks);
        }

        public Task<GameResult> GrantItemsAsync(IReadOnlyList<InventoryItemStack> items) =>
            CallCloudFunction("grantItems", items);

        public Task<GameResult> ConsumeItemsAsync(IReadOnlyList<InventoryItemStack> items) =>
            CallCloudFunction("consumeItems", items);

        private async Task<GameResult> CallCloudFunction(string functionName, IReadOnlyList<InventoryItemStack> items)
        {
            GameResult<CloudFunctionAck> result = await _cloudFunctions.ExecuteAsync<IReadOnlyList<InventoryItemStack>, CloudFunctionAck>(functionName, items);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        [System.Serializable]
        private struct CloudFunctionAck
        {
            public bool success;
        }
    }
}
#endif
