#if ROYALECLASH_PLAYFAB
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.PlayFab
{
    /// <summary>Same composition as LocalAchievementService — PlayFab has no distinct Achievements API, so this reads definitions from Title Data and progress from Statistics, and routes reward claims through CloudScript.</summary>
    public sealed class PlayFabAchievementService : IAchievementService
    {
        private const string DefinitionsConfigKey = "achievement_definitions";

        private readonly IRemoteConfigService _remoteConfig;
        private readonly IPlayerStatsService _stats;
        private readonly ICloudFunctionsService _cloudFunctions;

        public PlayFabAchievementService(IRemoteConfigService remoteConfig, IPlayerStatsService stats, ICloudFunctionsService cloudFunctions)
        {
            _remoteConfig = remoteConfig;
            _stats = stats;
            _cloudFunctions = cloudFunctions;
        }

        public async Task<GameResult<IReadOnlyList<AchievementProgress>>> GetProgressAsync()
        {
            GameResult<AchievementDefinitionList> defsResult = await _remoteConfig.GetConfigAsync(DefinitionsConfigKey, new AchievementDefinitionList());
            List<AchievementDefinition> definitions = defsResult.Value?.definitions ?? new List<AchievementDefinition>();

            GameResult<ClaimedAchievementIds> claimedResult = await _cloudFunctions.ExecuteAsync<object, ClaimedAchievementIds>("getClaimedAchievements", null);
            HashSet<string> claimed = claimedResult.Success ? new HashSet<string>(claimedResult.Value.ids) : new HashSet<string>();

            var progress = new List<AchievementProgress>(definitions.Count);
            foreach (AchievementDefinition def in definitions)
            {
                GameResult<int> stat = await _stats.GetStatisticAsync(def.StatName);
                int current = stat.Success ? stat.Value : 0;
                progress.Add(new AchievementProgress
                {
                    AchievementId = def.AchievementId,
                    CurrentValue = current,
                    TargetValue = def.TargetValue,
                    Completed = current >= def.TargetValue,
                    RewardClaimed = claimed.Contains(def.AchievementId),
                });
            }

            return GameResult<IReadOnlyList<AchievementProgress>>.Ok(progress);
        }

        public async Task<GameResult> ClaimRewardAsync(string achievementId)
        {
            GameResult<ClaimAck> result = await _cloudFunctions.ExecuteAsync<string, ClaimAck>("claimAchievement", achievementId);
            return result.Success ? GameResult.Successful : GameResult.Fail(result.Error);
        }

        [System.Serializable]
        private class AchievementDefinitionList
        {
            public List<AchievementDefinition> definitions = new List<AchievementDefinition>();
        }

        [System.Serializable]
        private struct ClaimedAchievementIds
        {
            public List<string> ids;
        }

        [System.Serializable]
        private struct ClaimAck
        {
            public bool success;
        }
    }
}
#endif
