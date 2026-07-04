using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// Interprets each <see cref="AbilityCode"/> against live simulation state. This is the
    /// only place ability behavior is implemented — Cards/AbilityDefinition stays pure data.
    /// Adding a new ability means adding an AbilityCode value (Module 2) and a case here.
    /// </summary>
    public sealed partial class BattleSimulation
    {
        private void ExecuteAbilityOnHit(BattleEntity attacker, BattleEntity primaryTarget, AbilityBlueprint ability)
        {
            switch (ability.Code)
            {
                case AbilityCode.BurnOnHit:
                    StatusEffectType effect = ability.Effect == StatusEffectType.None ? StatusEffectType.DamageOverTime : ability.Effect;
                    primaryTarget.ApplyStatusEffect(attacker.Owner, effect, ability.Magnitude, ability.Duration);
                    break;

                case AbilityCode.PierceExtraTargetOnHit:
                {
                    var stats = GetCombatStats(attacker);
                    if (TargetingSystem.TryFindNearestTarget(attacker, stats.canTarget, stats.range, _entities, out BattleEntity second, primaryTarget))
                        ApplyDamage(second, stats.damage * ability.Magnitude, attacker.Owner);
                    break;
                }

                case AbilityCode.ChainDamageOnHit:
                {
                    var stats = GetCombatStats(attacker);
                    if (TargetingSystem.TryFindNearestTarget(attacker, stats.canTarget, ability.Radius, _entities, out BattleEntity chained, primaryTarget))
                        ApplyDamage(chained, ability.Magnitude, attacker.Owner);
                    break;
                }
            }
        }

        private void ExecuteAbilityOnDeath(BattleEntity entity, AbilityBlueprint ability)
        {
            if (ability.Code != AbilityCode.ShockwaveOnDeath) return;
            ApplyAreaDamage(entity.Position, ability.Radius, entity.Owner, ability.Magnitude, TargetMask.GroundAndAir, includeAllies: false);
        }

        private void ExecuteAbilityPeriodic(TroopEntity troop, AbilityBlueprint ability)
        {
            switch (ability.Code)
            {
                case AbilityCode.SummonMinionsPeriodic:
                    SpawnSummonedMinion(troop.Owner, troop.Position);
                    break;

                case AbilityCode.HasteAuraPulse:
                    ApplyAreaStatusEffect(troop.Position, ability.Radius, troop.Owner, TargetMask.GroundAndAir,
                        StatusEffectType.Haste, ability.Magnitude, ability.Duration, includeAllies: true);
                    break;
            }
        }

        private void ExecuteAbilityOnActivate(TroopEntity champion, AbilityBlueprint ability)
        {
            switch (ability.Code)
            {
                case AbilityCode.SelfShieldOnActivate:
                    champion.ShieldHealth = ability.Magnitude;
                    champion.ShieldRemainingSeconds = ability.Duration > Fix64.Zero ? ability.Duration : Fix64.FromInt(999);
                    break;

                case AbilityCode.DashStrikeOnActivate:
                    if (TargetingSystem.TryFindNearestTarget(champion, champion.Blueprint.CanTarget, champion.Blueprint.SightRange, _entities, out BattleEntity target))
                    {
                        champion.Position = DashTowards(champion.Position, target.Position);
                        ApplyDamage(target, champion.Blueprint.Damage + ability.Magnitude, champion.Owner);
                    }
                    break;
            }
        }

        /// <summary>A minion summoned by an ability rather than deployed from a card — small, disposable, and free.</summary>
        private void SpawnSummonedMinion(PlayerSlot owner, Vector2Fix position)
        {
            var blueprint = new TroopBlueprint
            {
                Id = new CardId("summoned_rift_wisp"),
                ElixirCost = 0,
                Domain = UnitDomain.Ground,
                CanTarget = TargetMask.GroundAndAir,
                MaxHealth = Fix64.FromInt(80),
                Damage = Fix64.FromInt(40),
                HitSpeedSeconds = Fix64.OneValue,
                MoveSpeed = Fix64.FromFloat(1.5f),
                Range = Fix64.OneValue,
                SightRange = Fix64.FromInt(5),
                SpawnCount = 1,
            };
            SpawnTroop(owner, blueprint, position);
        }

        private static Vector2Fix DashTowards(Vector2Fix from, Vector2Fix targetPosition)
        {
            Fix64 dist = Vector2Fix.Distance(from, targetPosition);
            Fix64 stopShort = Fix64.OneValue;
            if (dist <= stopShort) return from;

            Vector2Fix direction = (targetPosition - from).Normalized();
            return from + direction * (dist - stopShort);
        }
    }
}
