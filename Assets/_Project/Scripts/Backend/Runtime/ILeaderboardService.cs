using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public interface ILeaderboardService
    {
        Task<GameResult<IReadOnlyList<LeaderboardEntry>>> GetLeaderboardAsync(string statName, int maxResults);

        Task<GameResult<LeaderboardEntry>> GetPlayerRankAsync(string statName);
    }
}
