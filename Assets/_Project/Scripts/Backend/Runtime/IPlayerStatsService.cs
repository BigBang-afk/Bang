using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public interface IPlayerStatsService
    {
        /// <summary>Sets a named statistic (e.g. "trophies", "wins", "bestFinish") to an absolute value — matches PlayFab's statistics model, which is versioned/aggregated server-side, not a client-side increment.</summary>
        Task<GameResult> UpdateStatisticAsync(string statName, int value);

        Task<GameResult<int>> GetStatisticAsync(string statName);
    }
}
