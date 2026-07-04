using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// Generic typed remote-config fetch (PlayFab Title Data). Backs Events, Shop
    /// Offers, and the Daily Reward schedule — Economy (Module 6) owns the actual schemas
    /// and business logic for what those look like; this just fetches whatever JSON blob is
    /// published under a key.
    /// </summary>
    public interface IRemoteConfigService
    {
        Task<GameResult<T>> GetConfigAsync<T>(string key, T fallback);
    }
}
