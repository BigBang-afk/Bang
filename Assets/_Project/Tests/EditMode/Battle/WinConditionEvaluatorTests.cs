using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class WinConditionEvaluatorTests
    {
        private static readonly RoyaleClash.Core.PlayerSlot A = BattleTestFactory.PlayerA;
        private static readonly RoyaleClash.Core.PlayerSlot B = BattleTestFactory.PlayerB;

        [Test]
        public void MoreCrowns_Wins()
        {
            BattleMatchResult result = WinConditionEvaluator.EvaluateAtTimeExpiry(A, 2, Fix64.Zero, B, 1, Fix64.Zero);
            Assert.AreEqual(MatchOutcome.Decisive, result.Outcome);
            Assert.AreEqual(A, result.Winner);
        }

        [Test]
        public void EqualCrowns_TiebreaksOnTowerDamage()
        {
            BattleMatchResult result = WinConditionEvaluator.EvaluateAtTimeExpiry(A, 1, Fix64.FromInt(100), B, 1, Fix64.FromInt(500));
            Assert.AreEqual(MatchOutcome.Decisive, result.Outcome);
            Assert.AreEqual(B, result.Winner);
        }

        [Test]
        public void EqualCrownsAndDamage_IsDraw()
        {
            BattleMatchResult result = WinConditionEvaluator.EvaluateAtTimeExpiry(A, 1, Fix64.FromInt(200), B, 1, Fix64.FromInt(200));
            Assert.AreEqual(MatchOutcome.Draw, result.Outcome);
            Assert.IsNull(result.Winner);
        }
    }
}
