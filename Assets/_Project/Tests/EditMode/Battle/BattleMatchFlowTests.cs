using System.Linq;
using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class BattleMatchFlowTests
    {
        private static readonly PlayerSlot A = BattleTestFactory.PlayerA;
        private static readonly PlayerSlot B = BattleTestFactory.PlayerB;
        private static readonly Fix64 Tick = Fix64.FromFloat(0.05f); // matches BattleConstants.SimulationTickRateHz

        // Ticks slightly past the requested duration so float/Fix64 rounding can never leave
        // Elapsed a hair under a ">="-guarded threshold (e.g. MatchDurationSeconds).
        private static void TickSeconds(BattleSimulation sim, float seconds)
        {
            int ticks = (int)System.Math.Ceiling(seconds / 0.05f) + 2;
            for (int i = 0; i < ticks; i++)
                sim.Tick(Tick);
        }

        [Test]
        public void DirectSpellOnEnemyKingTower_DestroysItAndEndsMatch()
        {
            var cardSet = new BattleCardSet();
            SpellBlueprint nuke = BattleTestFactory.MakeSpell("nuke", elixir: 1, radius: 1f, damage: 999999, affects: TargetMask.GroundAndAir);
            cardSet.AddSpell(nuke);
            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);

            Vector2Fix enemyKingPosition = sim.Arena.GetKingTowerPosition(B);
            GameResult cast = sim.TryCastSpell(A, nuke.Id, enemyKingPosition);
            Assert.IsTrue(cast.Success, cast.Error);

            sim.Tick(Tick);

            Assert.AreEqual(MatchPhase.Ended, sim.Phase);
            Assert.AreEqual(MatchOutcome.Decisive, sim.Result.Outcome);
            Assert.AreEqual(A, sim.Result.Winner);
        }

        [Test]
        public void EqualCrowns_TransitionsToOvertimeThenEndsInDraw()
        {
            BattleSimulation sim = BattleTestFactory.NewMatch();

            TickSeconds(sim, 180f);
            Assert.AreEqual(MatchPhase.Overtime, sim.Phase, "Equal crowns at time expiry should go to overtime, not end the match.");

            TickSeconds(sim, 60f);
            Assert.AreEqual(MatchPhase.Ended, sim.Phase);
            Assert.AreEqual(MatchOutcome.Draw, sim.Result.Outcome, "No towers were destroyed, so overtime should end in a draw.");
        }

        [Test]
        public void DeployingAfterMatchEnded_IsRejected()
        {
            var cardSet = new BattleCardSet();
            TroopBlueprint troop = BattleTestFactory.MakeTroop("late");
            cardSet.AddTroop(troop);
            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);

            TickSeconds(sim, 180f);
            TickSeconds(sim, 60f);
            Assert.AreEqual(MatchPhase.Ended, sim.Phase);

            GameResult result = sim.TryDeployTroop(A, troop.Id, new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));
            Assert.IsFalse(result.Success);
        }

        [Test]
        public void PrincessTowerDestroyed_AwardsCrownWithoutEndingMatch()
        {
            var cardSet = new BattleCardSet();
            SpellBlueprint nuke = BattleTestFactory.MakeSpell("nuke", elixir: 1, radius: 1f, damage: 999999, affects: TargetMask.GroundAndAir);
            cardSet.AddSpell(nuke);
            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);

            Vector2Fix princessPosition = sim.Arena.GetPrincessTowerPosition(B, Lane.Left);
            sim.TryCastSpell(A, nuke.Id, princessPosition);
            sim.Tick(Tick);

            Assert.AreEqual(MatchPhase.Battle, sim.Phase, "Losing a princess tower should not end the match outright.");
            Assert.AreEqual(1, sim.GetCrowns(A));
        }
    }
}
