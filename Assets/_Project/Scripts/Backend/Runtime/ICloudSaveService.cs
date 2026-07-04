using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    /// <summary>
    /// Generic typed key/value cloud persistence — the one true "Cloud Save" primitive
    /// every other feature (decks, mail inbox, clan membership cache, achievement claims)
    /// is built on rather than each inventing its own storage.
    /// </summary>
    public interface ICloudSaveService
    {
        Task<GameResult> SaveAsync<T>(string key, T value);
        Task<GameResult<T>> LoadAsync<T>(string key);
        Task<GameResult> DeleteAsync(string key);
    }
}
