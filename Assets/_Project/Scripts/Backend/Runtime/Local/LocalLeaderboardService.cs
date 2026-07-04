using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Offline stand-in: there's no one else to rank against, so this always returns just the local player at position 1.</summary>
    public sealed class LocalLeaderboardService : ILeaderboardService
    {
        private readonly IPlayerStatsService _stats;
        private readonly PlayerAccountId _localAccountId;
        private readonly string _localDisplayName;

        public LocalLeaderboardService(IPlayerStatsService stats, PlayerAccountId localAccountId, string localDisplayName)
        {
            _stats = stats;
            _localAccountId = localAccountId;
            _localDisplayName = localDisplayName;
        }

        public async Task<GameResult<IReadOnlyList<LeaderboardEntry>>> GetLeaderboardAsync(string statName, int maxResults)
        {
            GameResult<LeaderboardEntry> self = await GetPlayerRankAsync(statName);
            IReadOnlyList<LeaderboardEntry> entries = self.Success
                ? new List<LeaderboardEntry> { self.Value }
                : new List<LeaderboardEntry>();
            return GameResult<IReadOnlyList<LeaderboardEntry>>.Ok(entries);
        }

        public async Task<GameResult<LeaderboardEntry>> GetPlayerRankAsync(string statName)
        {
            GameResult<int> stat = await _stats.GetStatisticAsync(statName);
            var entry = new LeaderboardEntry(_localAccountId, _localDisplayName, position: 1, statValue: stat.Success ? stat.Value : 0);
            return GameResult<LeaderboardEntry>.Ok(entry);
        }
    }
}
