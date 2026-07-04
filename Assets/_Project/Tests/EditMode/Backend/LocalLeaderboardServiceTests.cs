using System.Threading.Tasks;
using NUnit.Framework;
using RoyaleClash.Backend;
using RoyaleClash.Backend.Local;
using RoyaleClash.Core;

namespace RoyaleClash.Tests.EditMode
{
    public class LocalLeaderboardServiceTests
    {
        [Test]
        public async Task GetPlayerRank_ReflectsCurrentStatValue()
        {
            var stats = new LocalPlayerStatsService();
            await stats.UpdateStatisticAsync("trophies", 3200);
            var leaderboard = new LocalLeaderboardService(stats, new PlayerAccountId("p1"), "Ash");

            GameResult<LeaderboardEntry> rank = await leaderboard.GetPlayerRankAsync("trophies");

            Assert.IsTrue(rank.Success);
            Assert.AreEqual(3200, rank.Value.StatValue);
            Assert.AreEqual(1, rank.Value.Position);
            Assert.AreEqual("Ash", rank.Value.DisplayName);
        }

        [Test]
        public async Task GetLeaderboard_ContainsOnlyTheLocalPlayer()
        {
            var stats = new LocalPlayerStatsService();
            var leaderboard = new LocalLeaderboardService(stats, new PlayerAccountId("p1"), "Ash");

            GameResult<System.Collections.Generic.IReadOnlyList<LeaderboardEntry>> board = await leaderboard.GetLeaderboardAsync("trophies", 50);

            Assert.AreEqual(1, board.Value.Count);
        }
    }
}
