using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// Executes server-side logic that must not be trusted to the client: purchase
    /// validation, chest-opening RNG, match-result reward granting. Maps to PlayFab
    /// CloudScript/Azure Functions integration.
    /// </summary>
    public interface ICloudFunctionsService
    {
        Task<GameResult<TResult>> ExecuteAsync<TArgs, TResult>(string functionName, TArgs args);
    }
}
