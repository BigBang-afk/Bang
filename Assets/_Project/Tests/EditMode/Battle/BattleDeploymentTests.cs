using System.Linq;
using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class BattleDeploymentTests
    {
        private static readonly PlayerSlot A = BattleTestFactory.PlayerA;
        private static readonly PlayerSlot B = BattleTestFactory.PlayerB;

        private static BattleSimulation NewMatchWithTroop(string troopId, int elixir, out CardId cardId)
        {
            var cardSet = new BattleCardSet();
            TroopBlueprint troop = BattleTestFactory.MakeTroop(troopId, elixir: elixir);
            cardSet.AddTroop(troop);
            cardId = troop.Id;
            return BattleTestFactory.NewMatch(cardSet);
        }

        [Test]
        public void DeployingTroop_OnOwnSide_SpendsElixirAndSpawns()
        {
            BattleSimulation sim = NewMatchWithTroop("t1", elixir: 3, out CardId cardId);
            Fix64 before = sim.GetElixir(A).Current;

            GameResult result = sim.TryDeployTroop(A, cardId, new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));

            Assert.IsTrue(result.Success, result.Error);
            Assert.AreEqual(before.ToFloat() - 3f, sim.GetElixir(A).Current.ToFloat(), 0.001f);
            Assert.IsTrue(sim.Entities.Any(e => e is TroopEntity troop && troop.Blueprint.Id.Equals(cardId)));
        }

        [Test]
        public void DeployingTroop_OnEnemySide_Fails()
        {
            BattleSimulation sim = NewMatchWithTroop("t1", elixir: 3, out CardId cardId);

            GameResult result = sim.TryDeployTroop(A, cardId, new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(30)));

            Assert.IsFalse(result.Success);
        }

        [Test]
        public void DeployingTroop_WithInsufficientElixir_Fails()
        {
            BattleSimulation sim = NewMatchWithTroop("t1", elixir: 9, out CardId cardId);

            // Starting elixir is 5, card costs 9.
            GameResult result = sim.TryDeployTroop(A, cardId, new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));

            Assert.IsFalse(result.Success);
        }

        [Test]
        public void DeployingUnknownCard_Fails()
        {
            BattleSimulation sim = BattleTestFactory.NewMatch();
            GameResult result = sim.TryDeployTroop(A, new CardId("does_not_exist"), new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));
            Assert.IsFalse(result.Success);
        }

        [Test]
        public void SwarmCard_SpawnsMultipleEntities()
        {
            var cardSet = new BattleCardSet();
            TroopBlueprint swarm = BattleTestFactory.MakeTroop("swarm", elixir: 3, spawnCount: 4);
            cardSet.AddTroop(swarm);
            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);

            sim.TryDeployTroop(A, swarm.Id, new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));

            Assert.AreEqual(4, sim.Entities.Count(e => e is TroopEntity t && t.Blueprint.Id.Equals(swarm.Id)));
        }
    }
}
