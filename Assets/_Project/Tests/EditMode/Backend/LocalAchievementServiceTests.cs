using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalAchievementServiceTests
    {
        private static (LocalAchievementService achievements, LocalPlayerStatsService stats, LocalInventoryService inventory) MakeService()
        {
            var stats = new LocalPlayerStatsService();
            var inventory = new LocalInventoryService();
            var cloudSave = new LocalCloudSaveService();

            var definitions = new List<AchievementDefinition>
            {
                new AchievementDefinition
                {
                    AchievementId = "win_10",
                    StatName = "wins",
                    TargetValue = 10,
                    Rewards = new List<InventoryItemStack> { new InventoryItemStack("gems", 50) },
                },
            };

            // LocalRemoteConfigService always returns the caller-supplied fallback, so seed
            // achievements via that fallback rather than a real publish step.
            var achievements = new LocalAchievementService(new FixedRemoteConfig(definitions), stats, inventory, cloudSave);
            return (achievements, stats, inventory);
        }

        // Minimal IRemoteConfigService that returns a fixed value regardless of key, so tests
        // can seed achievement definitions without a real backend to publish them to.
        private sealed class FixedRemoteConfig : IRemoteConfigService
        {
            private readonly List<AchievementDefinition> _definitions;
            public FixedRemoteConfig(List<AchievementDefinition> definitions) => _definitions = definitions;

            public Task<GameResult<T>> GetConfigAsync<T>(string key, T fallback)
            {
                if (typeof(T) == typeof(List<AchievementDefinition>))
                    return Task.FromResult(GameResult<T>.Ok((T)(object)_definitions));
                return Task.FromResult(GameResult<T>.Ok(fallback));
            }
        }

        [Test]
        public async Task GetProgress_ReflectsCurrentStat()
        {
            (LocalAchievementService achievements, LocalPlayerStatsService stats, _) = MakeService();
            await stats.UpdateStatisticAsync("wins", 4);

            GameResult<IReadOnlyList<AchievementProgress>> progress = await achievements.GetProgressAsync();

            AchievementProgress entry = progress.Value.Single(p => p.AchievementId == "win_10");
            Assert.AreEqual(4, entry.CurrentValue);
            Assert.IsFalse(entry.Completed);
        }

        [Test]
        public async Task ClaimReward_BeforeCompletion_Fails()
        {
            (LocalAchievementService achievements, LocalPlayerStatsService stats, _) = MakeService();
            await stats.UpdateStatisticAsync("wins", 4);

            GameResult result = await achievements.ClaimRewardAsync("win_10");

            Assert.IsFalse(result.Success);
        }

        [Test]
        public async Task ClaimReward_AfterCompletion_GrantsRewardAndMarksClaimed()
        {
            (LocalAchievementService achievements, LocalPlayerStatsService stats, LocalInventoryService inventory) = MakeService();
            await stats.UpdateStatisticAsync("wins", 10);

            GameResult result = await achievements.ClaimRewardAsync("win_10");
            Assert.IsTrue(result.Success, result.Error);

            GameResult<IReadOnlyList<InventoryItemStack>> inv = await inventory.GetInventoryAsync();
            Assert.AreEqual(50, inv.Value.Single(i => i.ItemId == "gems").Amount);

            GameResult<IReadOnlyList<AchievementProgress>> progress = await achievements.GetProgressAsync();
            Assert.IsTrue(progress.Value.Single(p => p.AchievementId == "win_10").RewardClaimed);
        }

        [Test]
        public async Task ClaimReward_Twice_FailsSecondTime()
        {
            (LocalAchievementService achievements, LocalPlayerStatsService stats, _) = MakeService();
            await stats.UpdateStatisticAsync("wins", 10);
            await achievements.ClaimRewardAsync("win_10");

            GameResult second = await achievements.ClaimRewardAsync("win_10");

            Assert.IsFalse(second.Success);
        }
    }
}
