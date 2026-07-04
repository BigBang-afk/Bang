using System;
using System.Linq;
using RoyaleClash.Cards;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// Converts authored Cards ScriptableObjects into plain Fix64 blueprints at match-setup
    /// time, applying the card's level via <see cref="CardLevelCurve"/>. This is the only
    /// place in the Battle assembly that touches Unity ScriptableObject references — once a
    /// match starts, the simulation only ever sees blueprints.
    /// </summary>
    public static class BlueprintFactory
    {
        public static AbilityBlueprint FromAbility(AbilityDefinition def)
        {
            if (def == null) return null;
            return new AbilityBlueprint
            {
                AbilityId = def.AbilityId,
                Code = def.Code,
                Effect = def.AppliesEffect,
                Magnitude = Fix64.FromFloat(def.Magnitude),
                Duration = Fix64.FromFloat(def.DurationSeconds),
                Radius = Fix64.FromFloat(def.RadiusTiles),
                Cooldown = Fix64.FromFloat(def.CooldownSeconds),
                ElixirCost = def.ElixirCostToActivate,
            };
        }

        public static EvolutionBlueprint FromEvolution(EvolutionDefinition def)
        {
            if (def == null) return null;
            return new EvolutionBlueprint
            {
                BonusAbility = FromAbility(def.BonusAbility),
                StatBonusPercent = Fix64.FromFloat(def.StatBonusPercent),
            };
        }

        public static TroopBlueprint FromTroop(TroopDefinition def, int level, CardLevelCurve curve)
        {
            CardStatBlock stats = def.GetStatsAtLevel(level, curve);
            return new TroopBlueprint
            {
                Id = def.Id,
                ElixirCost = def.ElixirCost,
                Domain = def.Domain,
                CanTarget = def.CanTarget,
                MaxHealth = Fix64.FromInt(stats.Health),
                Damage = Fix64.FromInt(stats.Damage),
                HitSpeedSeconds = Fix64.FromFloat(stats.HitSpeedSeconds),
                MoveSpeed = Fix64.FromFloat(stats.MoveSpeedTilesPerSecond),
                Range = Fix64.FromFloat(stats.RangeTiles),
                SightRange = Fix64.FromFloat(stats.SightRangeTiles),
                DeployTimeSeconds = Fix64.FromFloat(stats.DeployTimeSeconds),
                SpawnCount = Math.Max(1, stats.SpawnCount),
                SplashRadius = Fix64.FromFloat(stats.SplashRadiusTiles),
                PassiveAbilities = def.PassiveAbilities?.Select(FromAbility).Where(a => a != null).ToArray() ?? Array.Empty<AbilityBlueprint>(),
                Evolution = FromEvolution(def.Evolution),
            };
        }

        public static ChampionBlueprint FromChampion(ChampionDefinition def, int level, CardLevelCurve curve)
        {
            TroopBlueprint baseTroop = FromTroop(def, level, curve);
            return new ChampionBlueprint
            {
                Id = baseTroop.Id,
                ElixirCost = baseTroop.ElixirCost,
                Domain = baseTroop.Domain,
                CanTarget = baseTroop.CanTarget,
                MaxHealth = baseTroop.MaxHealth,
                Damage = baseTroop.Damage,
                HitSpeedSeconds = baseTroop.HitSpeedSeconds,
                MoveSpeed = baseTroop.MoveSpeed,
                Range = baseTroop.Range,
                SightRange = baseTroop.SightRange,
                DeployTimeSeconds = baseTroop.DeployTimeSeconds,
                SpawnCount = baseTroop.SpawnCount,
                SplashRadius = baseTroop.SplashRadius,
                PassiveAbilities = baseTroop.PassiveAbilities,
                Evolution = baseTroop.Evolution,
                ActiveAbility = FromAbility(def.ActiveAbility),
                AbilityElixirCost = def.AbilityElixirCost,
            };
        }

        public static BuildingBlueprint FromBuilding(BuildingDefinition def, int level, CardLevelCurve curve)
        {
            CardStatBlock stats = def.GetStatsAtLevel(level, curve);
            return new BuildingBlueprint
            {
                Id = def.Id,
                ElixirCost = def.ElixirCost,
                CanTarget = def.CanTarget,
                MaxHealth = Fix64.FromInt(stats.Health),
                Damage = Fix64.FromInt(stats.Damage),
                HitSpeedSeconds = Fix64.FromFloat(stats.HitSpeedSeconds),
                Range = Fix64.FromFloat(stats.RangeTiles),
                LifespanSeconds = Fix64.FromFloat(def.LifespanSeconds),
                SpawnsTroop = string.IsNullOrEmpty(def.SpawnsTroopCardId) ? null : def.SpawnsTroop,
                SpawnIntervalSeconds = Fix64.FromFloat(def.SpawnIntervalSeconds),
                BonusElixirGenerated = Fix64.FromFloat(def.BonusElixirGenerated),
            };
        }

        public static SpellBlueprint FromSpell(SpellDefinition def, int level, CardLevelCurve curve)
        {
            return new SpellBlueprint
            {
                Id = def.Id,
                ElixirCost = def.ElixirCost,
                Radius = Fix64.FromFloat(def.RadiusTiles),
                Damage = Fix64.FromInt(def.GetDamageAtLevel(level, curve)),
                AffectsTargets = def.AffectsTargets,
                AffectsOwnUnits = def.AffectsOwnUnits,
                Effect = def.Effect,
                EffectMagnitude = Fix64.FromFloat(def.EffectMagnitude),
                EffectDurationSeconds = Fix64.FromFloat(def.EffectDurationSeconds),
                DelaySeconds = Fix64.FromFloat(def.DelaySeconds),
            };
        }
    }
}
