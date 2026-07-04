#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    public sealed class PlayFabLeaderboardService : ILeaderboardService
    {
        public async Task<GameResult<IReadOnlyList<LeaderboardEntry>>> GetLeaderboardAsync(string statName, int maxResults)
        {
            var request = new GetLeaderboardRequest { StatisticName = statName, MaxResultsCount = maxResults };
            PlayFabResult<GetLeaderboardResult> result = await PlayFabClientAPI.GetLeaderboardAsync(request);

            if (result.Error != null)
                return GameResult<IReadOnlyList<LeaderboardEntry>>.Fail(result.Error.ErrorMessage);

            IReadOnlyList<LeaderboardEntry> entries = result.Result.Leaderboard
                .Select(e => new LeaderboardEntry(new PlayerAccountId(e.PlayFabId), e.DisplayName, e.Position + 1, e.StatValue))
                .ToList();

            return GameResult<IReadOnlyList<LeaderboardEntry>>.Ok(entries);
        }

        public async Task<GameResult<LeaderboardEntry>> GetPlayerRankAsync(string statName)
        {
            var request = new GetLeaderboardAroundPlayerRequest { StatisticName = statName, MaxResultsCount = 1 };
            PlayFabResult<GetLeaderboardAroundPlayerResult> result = await PlayFabClientAPI.GetLeaderboardAroundPlayerAsync(request);

            if (result.Error != null)
                return GameResult<LeaderboardEntry>.Fail(result.Error.ErrorMessage);

            PlayerLeaderboardEntry self = result.Result.Leaderboard.FirstOrDefault();
            if (self == null)
                return GameResult<LeaderboardEntry>.Fail("Player has no rank on this leaderboard yet.");

            return GameResult<LeaderboardEntry>.Ok(new LeaderboardEntry(new PlayerAccountId(self.PlayFabId), self.DisplayName, self.Position + 1, self.StatValue));
        }
    }
}
#endif
