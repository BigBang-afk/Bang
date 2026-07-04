using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>
    /// In-memory stand-in for cloud save — real persistence for a logged-out/offline player
    /// (Practice mode, first-launch-before-login) and for tests. Values are held as-is
    /// in-process rather than round-tripped through JSON, since there's no real network
    /// boundary to cross here; PlayFabCloudSaveService (gated) is what actually serializes.
    /// </summary>
    public sealed class LocalCloudSaveService : ICloudSaveService
    {
        private readonly Dictionary<string, object> _store = new Dictionary<string, object>();

        public Task<GameResult> SaveAsync<T>(string key, T value)
        {
            _store[key] = value;
            return Task.FromResult(GameResult.Successful);
        }

        public Task<GameResult<T>> LoadAsync<T>(string key)
        {
            if (!_store.TryGetValue(key, out object stored))
                return Task.FromResult(GameResult<T>.Fail($"No saved value for key '{key}'."));

            if (stored is T typed)
                return Task.FromResult(GameResult<T>.Ok(typed));

            return Task.FromResult(GameResult<T>.Fail($"Saved value for key '{key}' is not of type {typeof(T).Name}."));
        }

        public Task<GameResult> DeleteAsync(string key)
        {
            _store.Remove(key);
            return Task.FromResult(GameResult.Successful);
        }
    }
}
