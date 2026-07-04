#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>
    /// Backed by PlayFab's Player Data (UpdateUserData/GetUserData) — "private" visibility,
    /// readable/writable by the owning client and readable server-side by CloudScript.
    ///
    /// CAVEAT: values round-trip through <see cref="JsonUtility"/>, which only supports
    /// [Serializable] classes/structs — not bare primitives (int, string) or a bare List/Dictionary
    /// at the root. Save/load a wrapper type for those (or swap in a full JSON library) if a
    /// caller needs to persist a primitive directly.
    /// </summary>
    public sealed class PlayFabCloudSaveService : ICloudSaveService
    {
        public async Task<GameResult> SaveAsync<T>(string key, T value)
        {
            string json = JsonUtility.ToJson(value);
            var request = new UpdateUserDataRequest
            {
                Data = new Dictionary<string, string> { [key] = json },
            };

            PlayFabResult<UpdateUserDataResult> result = await PlayFabClientAPI.UpdateUserDataAsync(request);
            return result.Error != null ? GameResult.Fail(result.Error.ErrorMessage) : GameResult.Successful;
        }

        public async Task<GameResult<T>> LoadAsync<T>(string key)
        {
            var request = new GetUserDataRequest { Keys = new List<string> { key } };
            PlayFabResult<GetUserDataResult> result = await PlayFabClientAPI.GetUserDataAsync(request);

            if (result.Error != null)
                return GameResult<T>.Fail(result.Error.ErrorMessage);

            if (result.Result.Data == null || !result.Result.Data.TryGetValue(key, out UserDataRecord record))
                return GameResult<T>.Fail($"No saved value for key '{key}'.");

            try
            {
                return GameResult<T>.Ok(JsonUtility.FromJson<T>(record.Value));
            }
            catch (System.Exception ex)
            {
                return GameResult<T>.Fail($"Failed to parse saved value for '{key}': {ex.Message}");
            }
        }

        public async Task<GameResult> DeleteAsync(string key)
        {
            // PlayFab's client API has no direct "delete a key" call; the documented approach
            // is to overwrite it with an empty value via UpdateUserData, or remove it
            // server-side via CloudScript if a true delete is required.
            var request = new UpdateUserDataRequest
            {
                Data = new Dictionary<string, string> { [key] = string.Empty },
            };
            PlayFabResult<UpdateUserDataResult> result = await PlayFabClientAPI.UpdateUserDataAsync(request);
            return result.Error != null ? GameResult.Fail(result.Error.ErrorMessage) : GameResult.Successful;
        }
    }
}
#endif
