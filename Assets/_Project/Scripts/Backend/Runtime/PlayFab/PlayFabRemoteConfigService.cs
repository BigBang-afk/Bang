#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>Backed by PlayFab Title Data — read-only, published from the Game Manager dashboard (or set via CloudScript/Admin API for live-ops tooling).</summary>
    public sealed class PlayFabRemoteConfigService : IRemoteConfigService
    {
        public async Task<GameResult<T>> GetConfigAsync<T>(string key, T fallback)
        {
            var request = new GetTitleDataRequest { Keys = new List<string> { key } };
            PlayFabResult<GetTitleDataResult> result = await PlayFabClientAPI.GetTitleDataAsync(request);

            if (result.Error != null)
                return GameResult<T>.Ok(fallback); // Title data being unreachable shouldn't hard-fail the caller; fall back gracefully.

            if (result.Result.Data == null || !result.Result.Data.TryGetValue(key, out string json))
                return GameResult<T>.Ok(fallback);

            try
            {
                return GameResult<T>.Ok(JsonUtility.FromJson<T>(json));
            }
            catch (System.Exception)
            {
                return GameResult<T>.Ok(fallback);
            }
        }
    }
}
#endif
