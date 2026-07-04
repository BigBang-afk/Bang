#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlayFab;
using PlayFab.ClientModels;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    public sealed class PlayFabPlayerStatsService : IPlayerStatsService
    {
        public async Task<GameResult> UpdateStatisticAsync(string statName, int value)
        {
            var request = new UpdatePlayerStatisticsRequest
            {
                Statistics = new List<StatisticUpdate> { new StatisticUpdate { StatisticName = statName, Value = value } },
            };

            PlayFabResult<UpdatePlayerStatisticsResult> result = await PlayFabClientAPI.UpdatePlayerStatisticsAsync(request);
            return result.Error != null ? GameResult.Fail(result.Error.ErrorMessage) : GameResult.Successful;
        }

        public async Task<GameResult<int>> GetStatisticAsync(string statName)
        {
            var request = new GetPlayerStatisticsRequest { StatisticNames = new List<string> { statName } };
            PlayFabResult<GetPlayerStatisticsResult> result = await PlayFabClientAPI.GetPlayerStatisticsAsync(request);

            if (result.Error != null)
                return GameResult<int>.Fail(result.Error.ErrorMessage);

            StatisticValue stat = result.Result.Statistics.FirstOrDefault(s => s.StatisticName == statName);
            return GameResult<int>.Ok(stat?.Value ?? 0);
        }
    }
}
#endif
