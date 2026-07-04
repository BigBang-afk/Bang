using System.Linq;
using NUnit.Framework;
using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    public class BattleCombatTests
    {
        private static readonly PlayerSlot A = BattleTestFactory.PlayerA;
        private static readonly PlayerSlot B = BattleTestFactory.PlayerB;
        private static readonly Fix64 Tick = Fix64.FromFloat(0.05f); // 20Hz

        // Just south/north of the river (Y=16) so both sides can deploy legally and are already in range.
        private static readonly Vector2Fix NearRiverA = new Vector2Fix(Fix64.FromInt(9), Fix64.FromFloat(15.8f));
        private static readonly Vector2Fix NearRiverB = new Vector2Fix(Fix64.FromInt(9), Fix64.FromFloat(16.2f));

        [Test]
        public void OverwhelmingAttacker_KillsWeakerDefenderOnFirstHit()
        {
            var cardSet = new BattleCardSet();
            TroopBlueprint attacker = BattleTestFactory.MakeTroop("attacker", health: 500, damage: 1000, hitSpeed: 0.5f, range: 1.5f);
            TroopBlueprint defender = BattleTestFactory.MakeTroop("defender", health: 50, damage: 0, hitSpeed: 10f, range: 1.5f);
            cardSet.AddTroop(attacker);
            cardSet.AddTroop(defender);

            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);
            sim.TryDeployTroop(A, attacker.Id, NearRiverA);
            sim.TryDeployTroop(B, defender.Id, NearRiverB);

            sim.Tick(Tick);

            var remaining = sim.Entities.OfType<TroopEntity>().ToList();
            Assert.AreEqual(1, remaining.Count, "The one-shot-killed defender should have been removed.");
            Assert.IsTrue(remaining.Single().Owner.Equals(A));
        }

        [Test]
        public void SplashDamage_HitsNearbyEnemies()
        {
            var cardSet = new BattleCardSet();
            TroopBlueprint splasher = BattleTestFactory.MakeTroop("splasher", health: 500, damage: 100, hitSpeed: 1f, range: 5f, splash: 3f);
            TroopBlueprint victim1 = BattleTestFactory.MakeTroop("victim1", health: 50, damage: 0, hitSpeed: 10f, range: 1f);
            TroopBlueprint victim2 = BattleTestFactory.MakeTroop("victim2", health: 50, damage: 0, hitSpeed: 10f, range: 1f);
            cardSet.AddTroop(splasher);
            cardSet.AddTroop(victim1);
            cardSet.AddTroop(victim2);

            BattleSimulation sim = BattleTestFactory.NewMatch(cardSet);
            sim.TryDeployTroop(A, splasher.Id, NearRiverA);
            sim.TryDeployTroop(B, victim1.Id, NearRiverB);
            sim.TryDeployTroop(B, victim2.Id, NearRiverB + new Vector2Fix(Fix64.OneValue, Fix64.Zero));

            sim.Tick(Tick);

            Assert.AreEqual(0, sim.Entities.Count(e => e is TroopEntity t && t.Owner.Equals(B)), "Both nearby victims should have taken splash damage and died.");
        }

        [Test]
        public void Shield_AbsorbsDamageBeforeHealth()
        {
            var troop = new TroopEntity { Blueprint = BattleTestFactory.MakeTroop("dummy", health: 1000), Health = Fix64.FromInt(1000) };

            troop.ShieldHealth = Fix64.FromInt(100);
            troop.ShieldRemainingSeconds = Fix64.FromInt(5);

            bool died = troop.TakeDamage(Fix64.FromInt(60));

            Assert.IsFalse(died);
            Assert.AreEqual(40, troop.ShieldHealth.ToIntFloor());
            Assert.AreEqual(1000, troop.Health.ToIntFloor());
        }

        [Test]
        public void Shield_Overflow_SpillsIntoHealth()
        {
            var troop = new TroopEntity { Blueprint = BattleTestFactory.MakeTroop("dummy2"), Health = Fix64.FromInt(1000) };
            troop.ShieldHealth = Fix64.FromInt(30);

            troop.TakeDamage(Fix64.FromInt(100));

            Assert.AreEqual(0, troop.ShieldHealth.ToIntFloor());
            Assert.AreEqual(930, troop.Health.ToIntFloor());
        }

        [Test]
        public void FreezeStatusEffect_HaltsMovementEntirely()
        {
            var troop = new TroopEntity { Blueprint = BattleTestFactory.MakeTroop("mover", moveSpeed: 2f) };
            troop.ApplyStatusEffect(B, StatusEffectType.Freeze, Fix64.OneValue, Fix64.FromInt(2));

            Assert.AreEqual(Fix64.Zero, troop.MovementSpeedMultiplier());
        }

        [Test]
        public void SlowStatusEffect_ReducesMovementSpeedMultiplier()
        {
            var troop = new TroopEntity { Blueprint = BattleTestFactory.MakeTroop("slowed") };
            troop.ApplyStatusEffect(B, StatusEffectType.Slow, Fix64.FromFloat(0.5f), Fix64.FromInt(2));

            Assert.AreEqual(0.5f, troop.MovementSpeedMultiplier().ToFloat(), 0.001f);
        }
    }
}
