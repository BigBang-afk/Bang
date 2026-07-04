using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>Composes definitions (remote config) with progress (stats) and tracks claimed state via cloud save — no storage of its own.</summary>
    public sealed class LocalAchievementService : IAchievementService
    {
        private const string DefinitionsConfigKey = "achievement_definitions";
        private const string ClaimedSaveKey = "achievements_claimed";

        private readonly IRemoteConfigService _remoteConfig;
        private readonly IPlayerStatsService _stats;
        private readonly IInventoryService _inventory;
        private readonly ICloudSaveService _cloudSave;

        public LocalAchievementService(IRemoteConfigService remoteConfig, IPlayerStatsService stats, IInventoryService inventory, ICloudSaveService cloudSave)
        {
            _remoteConfig = remoteConfig;
            _stats = stats;
            _inventory = inventory;
            _cloudSave = cloudSave;
        }

        public async Task<GameResult<IReadOnlyList<AchievementProgress>>> GetProgressAsync()
        {
            List<AchievementDefinition> definitions = await LoadDefinitions();
            HashSet<string> claimed = await LoadClaimed();

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
            List<AchievementDefinition> definitions = await LoadDefinitions();
            AchievementDefinition definition = definitions.FirstOrDefault(d => d.AchievementId == achievementId);
            if (definition == null) return GameResult.Fail("Unknown achievement.");

            HashSet<string> claimed = await LoadClaimed();
            if (claimed.Contains(achievementId)) return GameResult.Fail("Reward already claimed.");

            GameResult<int> stat = await _stats.GetStatisticAsync(definition.StatName);
            if (!stat.Success || stat.Value < definition.TargetValue)
                return GameResult.Fail("Achievement not yet completed.");

            GameResult grant = await _inventory.GrantItemsAsync(definition.Rewards);
            if (!grant.Success) return grant;

            claimed.Add(achievementId);
            await _cloudSave.SaveAsync(ClaimedSaveKey, claimed);
            return GameResult.Successful;
        }

        private async Task<List<AchievementDefinition>> LoadDefinitions()
        {
            GameResult<List<AchievementDefinition>> result = await _remoteConfig.GetConfigAsync(DefinitionsConfigKey, new List<AchievementDefinition>());
            return result.Value ?? new List<AchievementDefinition>();
        }

        private async Task<HashSet<string>> LoadClaimed()
        {
            GameResult<HashSet<string>> result = await _cloudSave.LoadAsync<HashSet<string>>(ClaimedSaveKey);
            return result.Success ? result.Value : new HashSet<string>();
        }
    }
}
