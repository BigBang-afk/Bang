using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Offline stand-in: always returns the caller's fallback, since there's no published Title Data to fetch without a connection.</summary>
    public sealed class LocalRemoteConfigService : IRemoteConfigService
    {
        public Task<GameResult<T>> GetConfigAsync<T>(string key, T fallback) =>
            Task.FromResult(GameResult<T>.Ok(fallback));
    }
}
