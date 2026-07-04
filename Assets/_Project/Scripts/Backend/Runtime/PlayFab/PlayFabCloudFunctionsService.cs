#if ROYALECLASH_PLAYFAB
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>
    /// Executes PlayFab CloudScript. This is the ONLY path anything in this module uses to
    /// mutate economy-affecting state (grant/consume items, open chests, apply match rewards)
    /// — PlayFab's client API deliberately has no "grant myself items" call, and this module
    /// doesn't invent one either. Args/results are JSON via JsonUtility (see the caveat on
    /// PlayFabCloudSaveService about its limitations for non-object types).
    /// </summary>
    public sealed class PlayFabCloudFunctionsService : ICloudFunctionsService
    {
        public async Task<GameResult<TResult>> ExecuteAsync<TArgs, TResult>(string functionName, TArgs args)
        {
            var request = new ExecuteCloudScriptRequest
            {
                FunctionName = functionName,
                FunctionParameter = args,
                GeneratePlayStreamEvent = true,
            };

            PlayFabResult<ExecuteCloudScriptResult> result = await PlayFabClientAPI.ExecuteCloudScriptAsync(request);
            if (result.Error != null)
                return GameResult<TResult>.Fail(result.Error.ErrorMessage);

            if (result.Result.Error != null)
                return GameResult<TResult>.Fail($"CloudScript error: {result.Result.Error.Message}");

            try
            {
                string json = result.Result.FunctionResult?.ToString() ?? "{}";
                TResult parsed = JsonUtility.FromJson<TResult>(json);
                return GameResult<TResult>.Ok(parsed);
            }
            catch (System.Exception ex)
            {
                return GameResult<TResult>.Fail($"Failed to parse CloudScript result: {ex.Message}");
            }
        }
    }
}
#endif
