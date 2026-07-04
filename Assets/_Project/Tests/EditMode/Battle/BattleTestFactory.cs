using RoyaleClash.Battle;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Tests.EditMode
{
    /// <summary>Builds minimal, hand-authored blueprints for Battle tests, bypassing ScriptableObjects entirely.</summary>
    internal static class BattleTestFactory
    {
        public static readonly PlayerSlot PlayerA = new PlayerSlot(0);
        public static readonly PlayerSlot PlayerB = new PlayerSlot(1);

        public static TroopBlueprint MakeTroop(
            string id, int elixir = 3, int health = 500, int damage = 100,
            float hitSpeed = 1f, float moveSpeed = 1f, float range = 1f, float sightRange = 5.5f,
            TargetMask canTarget = TargetMask.GroundAndAir, UnitDomain domain = UnitDomain.Ground,
            int spawnCount = 1, float splash = 0f, AbilityBlueprint[] abilities = null)
        {
            return new TroopBlueprint
            {
                Id = new CardId(id),
                ElixirCost = elixir,
                Domain = domain,
                CanTarget = canTarget,
                MaxHealth = Fix64.FromInt(health),
                Damage = Fix64.FromInt(damage),
                HitSpeedSeconds = Fix64.FromFloat(hitSpeed),
                MoveSpeed = Fix64.FromFloat(moveSpeed),
                Range = Fix64.FromFloat(range),
                SightRange = Fix64.FromFloat(sightRange),
                SpawnCount = spawnCount,
                SplashRadius = Fix64.FromFloat(splash),
                PassiveAbilities = abilities ?? System.Array.Empty<AbilityBlueprint>(),
            };
        }

        public static BuildingBlueprint MakeBuilding(
            string id, int elixir = 4, int health = 800, int damage = 0,
            float hitSpeed = 1f, float range = 5f, TargetMask canTarget = TargetMask.GroundAndAir,
            float lifespan = 0f, string spawnsTroopId = null, float spawnInterval = 0f, float bonusElixir = 0f)
        {
            return new BuildingBlueprint
            {
                Id = new CardId(id),
                ElixirCost = elixir,
                CanTarget = canTarget,
                MaxHealth = Fix64.FromInt(health),
                Damage = Fix64.FromInt(damage),
                HitSpeedSeconds = Fix64.FromFloat(hitSpeed),
                Range = Fix64.FromFloat(range),
                LifespanSeconds = Fix64.FromFloat(lifespan),
                SpawnsTroop = spawnsTroopId == null ? (CardId?)null : new CardId(spawnsTroopId),
                SpawnIntervalSeconds = Fix64.FromFloat(spawnInterval),
                BonusElixirGenerated = Fix64.FromFloat(bonusElixir),
            };
        }

        public static SpellBlueprint MakeSpell(
            string id, int elixir = 3, float radius = 2.5f, int damage = 200,
            TargetMask affects = TargetMask.GroundAndAir, StatusEffectType effect = StatusEffectType.None,
            float effectMagnitude = 0f, float effectDuration = 0f, float delay = 0f, bool affectsOwnUnits = false)
        {
            return new SpellBlueprint
            {
                Id = new CardId(id),
                ElixirCost = elixir,
                Radius = Fix64.FromFloat(radius),
                Damage = Fix64.FromInt(damage),
                AffectsTargets = affects,
                AffectsOwnUnits = affectsOwnUnits,
                Effect = effect,
                EffectMagnitude = Fix64.FromFloat(effectMagnitude),
                EffectDurationSeconds = Fix64.FromFloat(effectDuration),
                DelaySeconds = Fix64.FromFloat(delay),
            };
        }

        public static BattleSimulation NewMatch(BattleCardSet cardSet = null)
        {
            var sim = new BattleSimulation(PlayerA, PlayerB, cardSet ?? new BattleCardSet());
            sim.Start();
            return sim;
        }
    }
}
