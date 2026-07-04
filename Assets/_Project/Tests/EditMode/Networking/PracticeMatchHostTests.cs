using System.Linq;
using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;
using RoyaleClash.Networking;

namespace RoyaleClash.Tests.EditMode
{
    public class PracticeMatchHostTests
    {
        private static readonly PlayerSlot Local = new PlayerSlot(0);
        private static readonly PlayerSlot Opponent = new PlayerSlot(1);
        private static readonly Fix64 Tick = Fix64.FromFloat(0.05f);

        private static BattleCardSet MakeCardSet(string troopId = "t1")
        {
            var cardSet = new BattleCardSet();
            cardSet.AddTroop(new TroopBlueprint
            {
                Id = new CardId(troopId),
                ElixirCost = 3,
                Domain = UnitDomain.Ground,
                CanTarget = TargetMask.GroundAndAir,
                MaxHealth = Fix64.FromInt(500),
                Damage = Fix64.FromInt(100),
                HitSpeedSeconds = Fix64.OneValue,
                MoveSpeed = Fix64.OneValue,
                Range = Fix64.OneValue,
                SightRange = Fix64.FromInt(5),
                SpawnCount = 1,
            });
            return cardSet;
        }

        [Test]
        public void ImplementsIMatchHost_AsPractice()
        {
            var host = new PracticeMatchHost(MakeCardSet(), Local, Opponent, opponentIsAi: false);
            Assert.AreEqual(MatchMode.Practice, host.Mode);
            Assert.AreEqual(Local, host.LocalPlayerSlot);
        }

        [Test]
        public void RequestDeployTroop_OnLocalSide_Succeeds()
        {
            var host = new PracticeMatchHost(MakeCardSet(), Local, Opponent, opponentIsAi: false);
            GameResult result = host.RequestDeployTroop(new CardId("t1"), new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));

            Assert.IsTrue(result.Success, result.Error);
            Assert.IsTrue(host.EntitySnapshots.Any(s => s.Owner.Equals(Local)));
        }

        [Test]
        public void EntitySpawnedEvent_FiresOnDeploy()
        {
            var host = new PracticeMatchHost(MakeCardSet(), Local, Opponent, opponentIsAi: false);
            int spawnedCount = 0;
            host.EntitySpawned += _ => spawnedCount++;

            host.RequestDeployTroop(new CardId("t1"), new Vector2Fix(Fix64.FromInt(9), Fix64.FromInt(4)));

            // Towers spawn during host construction (before this test's subscription attaches),
            // so only the troop deployed above should be observed here.
            Assert.AreEqual(1, spawnedCount);
        }

        [Test]
        public void AiOpponent_EventuallyDeploysATroop()
        {
            var host = new PracticeMatchHost(MakeCardSet(), Local, Opponent, opponentIsAi: true);

            for (int i = 0; i < 100 && !host.EntitySnapshots.Any(s => s.Owner.Equals(Opponent) && s.Kind == EntityKind.Troop); i++)
                host.Tick(Tick);

            Assert.IsTrue(host.EntitySnapshots.Any(s => s.Owner.Equals(Opponent) && s.Kind == EntityKind.Troop), "AI should have deployed a troop within 5 seconds.");
        }

        [Test]
        public void GetElixir_ReflectsLocalPlayerPool()
        {
            var host = new PracticeMatchHost(MakeCardSet(), Local, Opponent, opponentIsAi: false);
            Assert.AreEqual(5, host.GetElixir(Local).ToIntFloor()); // BattleConstants.StartingElixir
        }
    }
}
