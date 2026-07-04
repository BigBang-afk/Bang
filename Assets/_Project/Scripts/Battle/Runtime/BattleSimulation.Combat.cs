using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed partial class BattleSimulation
    {
        private void TickBuildings(Fix64 dt)
        {
            foreach (BuildingEntity building in _entities.OfType<BuildingEntity>().Where(b => b.IsAlive).ToList())
            {
                BuildingBlueprint blueprint = building.Blueprint;

                if (blueprint.LifespanSeconds > Fix64.Zero)
                {
                    building.LifespanRemaining -= dt;
                    if (building.LifespanRemaining <= Fix64.Zero)
                    {
                        building.Health = Fix64.Zero;
                        continue;
                    }
                }

                if (blueprint.IsSpawner)
                {
                    building.SpawnTimerRemaining -= dt;
                    if (building.SpawnTimerRemaining <= Fix64.Zero)
                    {
                        building.SpawnTimerRemaining = blueprint.SpawnIntervalSeconds;
                        if (blueprint.SpawnsTroop.HasValue && _cardSet.TryGetTroop(blueprint.SpawnsTroop.Value, out TroopBlueprint spawned))
                            SpawnTroop(building.Owner, spawned, building.Position);
                    }
                }

                if (blueprint.IsElixirGenerator)
                {
                    building.ElixirGenTimerRemaining -= dt;
                    if (building.ElixirGenTimerRemaining <= Fix64.Zero)
                    {
                        building.ElixirGenTimerRemaining = Fix64.OneValue;
                        Fix64 lifespan = Fix64.Max(blueprint.LifespanSeconds, Fix64.OneValue);
                        _elixir[building.Owner].Add(blueprint.BonusElixirGenerated / lifespan);
                    }
                }
            }
        }

        private void TickPendingSpells(Fix64 dt)
        {
            for (int i = _pendingSpells.Count - 1; i >= 0; i--)
            {
                PendingSpellCast cast = _pendingSpells[i];
                cast.RemainingDelay -= dt;
                if (cast.RemainingDelay > Fix64.Zero) continue;

                ResolveSpell(cast.Caster, cast.Blueprint, cast.Position);
                _pendingSpells.RemoveAt(i);
            }
        }

        private void TickStatusEffectsAndDamageOverTime(Fix64 dt)
        {
            foreach (BattleEntity entity in _entities.Where(e => e.IsAlive).ToList())
            {
                Fix64 dot = entity.TickStatusEffects(dt, out PlayerSlot applier);
                if (dot > Fix64.Zero)
                    ApplyDamage(entity, dot, applier);
            }
        }

        private void AcquireAndResolveCombat(Fix64 dt)
        {
            foreach (BattleEntity attacker in _entities.Where(e => e.IsAlive).ToList())
            {
                (Fix64 damage, Fix64 range, Fix64 hitSpeed, TargetMask canTarget, Fix64 sightRange, Fix64 splash) = GetCombatStats(attacker);
                if (damage <= Fix64.Zero) continue; // non-attacking entity (e.g. a pure resource/spawner building)

                if (attacker.AttackCooldownRemaining > Fix64.Zero)
                    attacker.AttackCooldownRemaining -= dt;

                if (attacker.IsStunnedOrFrozen) continue;

                BattleEntity target = ResolveCurrentTarget(attacker);
                if (target == null || !InRange(attacker, target, range))
                {
                    if (!TargetingSystem.TryFindNearestTarget(attacker, canTarget, sightRange, _entities, out target))
                    {
                        attacker.CurrentTargetId = EntityId.Invalid;
                        continue;
                    }
                    attacker.CurrentTargetId = target.Id;
                }

                if (!InRange(attacker, target, range))
                    continue; // still moving into range this tick (handled by MovementSystem)

                if (attacker.AttackCooldownRemaining > Fix64.Zero)
                    continue;

                Fix64 hasteMultiplier = attacker.MovementSpeedMultiplier(); // Rage/Haste also speed up attacks
                attacker.AttackCooldownRemaining = hasteMultiplier > Fix64.Zero ? hitSpeed / hasteMultiplier : hitSpeed;

                PerformAttack(attacker, target, damage, splash, canTarget);
            }
        }

        private BattleEntity ResolveCurrentTarget(BattleEntity attacker)
        {
            if (!attacker.CurrentTargetId.IsValid) return null;
            BattleEntity target = _entities.FirstOrDefault(e => e.Id == attacker.CurrentTargetId);
            return target is { IsAlive: true } ? target : null;
        }

        private static bool InRange(BattleEntity attacker, BattleEntity target, Fix64 range) =>
            Vector2Fix.DistanceSquared(attacker.Position, target.Position) <= range * range;

        private void PerformAttack(BattleEntity attacker, BattleEntity primaryTarget, Fix64 damage, Fix64 splash, TargetMask canTarget)
        {
            ApplyDamage(primaryTarget, damage, attacker.Owner);

            if (splash > Fix64.Zero)
            {
                foreach (BattleEntity other in _entities.Where(e => e.IsAlive && e != primaryTarget && !e.Owner.Equals(attacker.Owner)).ToList())
                {
                    if (!TargetingSystem.IsTargetable(other, canTarget)) continue;
                    if (Vector2Fix.Distance(primaryTarget.Position, other.Position) <= splash)
                        ApplyDamage(other, damage, attacker.Owner);
                }
            }

            foreach (AbilityBlueprint ability in GetPassiveAbilities(attacker))
                ExecuteAbilityOnHit(attacker, primaryTarget, ability);
        }

        private (Fix64 damage, Fix64 range, Fix64 hitSpeed, TargetMask canTarget, Fix64 sightRange, Fix64 splash) GetCombatStats(BattleEntity entity)
        {
            switch (entity)
            {
                case TroopEntity troop:
                    return (troop.Blueprint.Damage, troop.Blueprint.Range, troop.Blueprint.HitSpeedSeconds, troop.Blueprint.CanTarget, troop.Blueprint.SightRange, troop.Blueprint.SplashRadius);
                case BuildingEntity building:
                    return (building.Blueprint.Damage, building.Blueprint.Range, building.Blueprint.HitSpeedSeconds, building.Blueprint.CanTarget, building.Blueprint.Range, Fix64.Zero);
                case TowerEntity tower:
                    return (tower.Blueprint.Damage, tower.Blueprint.Range, tower.Blueprint.HitSpeedSeconds, tower.Blueprint.CanTarget, tower.Blueprint.Range, Fix64.Zero);
                default:
                    return (Fix64.Zero, Fix64.Zero, Fix64.OneValue, TargetMask.None, Fix64.Zero, Fix64.Zero);
            }
        }

        private static IEnumerable<AbilityBlueprint> GetPassiveAbilities(BattleEntity entity) =>
            entity is TroopEntity troop ? troop.Blueprint.PassiveAbilities : System.Array.Empty<AbilityBlueprint>();

        private void ResolvePeriodicAbilities(Fix64 dt)
        {
            foreach (TroopEntity troop in _entities.OfType<TroopEntity>().Where(t => t.IsAlive).ToList())
            {
                foreach (AbilityBlueprint ability in troop.Blueprint.PassiveAbilities)
                {
                    if (ability.Code != AbilityCode.SummonMinionsPeriodic && ability.Code != AbilityCode.HasteAuraPulse)
                        continue;

                    troop.AbilityCooldownRemaining -= dt;
                    if (troop.AbilityCooldownRemaining > Fix64.Zero) continue;

                    troop.AbilityCooldownRemaining = ability.Cooldown;
                    ExecuteAbilityPeriodic(troop, ability);
                }
            }
        }

        internal void ApplyDamage(BattleEntity target, Fix64 amount, PlayerSlot? source)
        {
            if (!target.IsAlive) return;

            bool died = target.TakeDamage(amount);

            if (target.Kind == EntityKind.Tower && source.HasValue)
                _towerDamageDealt[source.Value] = _towerDamageDealt[source.Value] + amount;

            if (died)
                _pendingDeaths.Add(target);
        }

        private void ApplyAreaDamage(Vector2Fix center, Fix64 radius, PlayerSlot source, Fix64 damage, TargetMask affects, bool includeAllies)
        {
            foreach (BattleEntity entity in _entities.Where(e => e.IsAlive).ToList())
            {
                if (!includeAllies && entity.Owner.Equals(source)) continue;
                if (!TargetingSystem.IsTargetable(entity, affects)) continue;
                if (Vector2Fix.Distance(entity.Position, center) > radius) continue;
                ApplyDamage(entity, damage, source);
            }
        }

        private void ApplyAreaStatusEffect(Vector2Fix center, Fix64 radius, PlayerSlot source, TargetMask affects, StatusEffectType effect, Fix64 magnitude, Fix64 duration, bool includeAllies)
        {
            foreach (BattleEntity entity in _entities.Where(e => e.IsAlive).ToList())
            {
                if (!includeAllies && entity.Owner.Equals(source)) continue;
                if (!TargetingSystem.IsTargetable(entity, affects)) continue;
                if (Vector2Fix.Distance(entity.Position, center) > radius) continue;
                entity.ApplyStatusEffect(source, effect, magnitude, duration);
            }
        }

        private void ResolveSpell(PlayerSlot caster, SpellBlueprint spell, Vector2Fix position)
        {
            if (spell.Damage > Fix64.Zero)
                ApplyAreaDamage(position, spell.Radius, caster, spell.Damage, spell.AffectsTargets, spell.AffectsOwnUnits);

            if (spell.Effect != StatusEffectType.None)
                ApplyAreaStatusEffect(position, spell.Radius, caster, spell.AffectsTargets, spell.Effect, spell.EffectMagnitude, spell.EffectDurationSeconds, spell.AffectsOwnUnits);
        }

        private readonly List<BattleEntity> _pendingDeaths = new List<BattleEntity>();

        private void ProcessDeaths()
        {
            if (_pendingDeaths.Count == 0) return;

            foreach (BattleEntity dead in _pendingDeaths.Distinct())
            {
                foreach (AbilityBlueprint ability in GetPassiveAbilities(dead))
                    ExecuteAbilityOnDeath(dead, ability);

                if (dead is TowerEntity tower)
                    HandleTowerDestroyed(tower);

                _entities.Remove(dead);
                EntityDied?.Invoke(dead);
            }
            _pendingDeaths.Clear();
        }

        private void HandleTowerDestroyed(TowerEntity tower)
        {
            if (tower.Blueprint.Tier == TowerTier.King)
            {
                Result = BattleMatchResult.Decisive(Opponent(tower.Owner), "King tower destroyed.");
                Phase = MatchPhase.Ended;
                MatchEnded?.Invoke(Result);
                return;
            }

            if (!tower.CrownAwarded)
            {
                tower.CrownAwarded = true;
                _crowns[Opponent(tower.Owner)]++;
            }

            if (Phase == MatchPhase.Overtime)
            {
                Result = BattleMatchResult.Decisive(Opponent(tower.Owner), "Sudden death: first tower destroyed in overtime.");
                Phase = MatchPhase.Ended;
                MatchEnded?.Invoke(Result);
            }
        }

        private void CheckTimeExpiry()
        {
            if (Phase == MatchPhase.Battle && Elapsed >= BattleConstants.MatchDurationSeconds)
            {
                if (_crowns[_playerA] != _crowns[_playerB])
                {
                    EndDecisively();
                }
                else
                {
                    Phase = MatchPhase.Overtime;
                    Elapsed = Fix64.Zero;
                }
            }
            else if (Phase == MatchPhase.Overtime && Elapsed >= BattleConstants.OvertimeDurationSeconds)
            {
                EndDecisively();
            }
        }

        private void EndDecisively()
        {
            Result = WinConditionEvaluator.EvaluateAtTimeExpiry(
                _playerA, _crowns[_playerA], _towerDamageDealt[_playerA],
                _playerB, _crowns[_playerB], _towerDamageDealt[_playerB]);
            Phase = MatchPhase.Ended;
            MatchEnded?.Invoke(Result);
        }
    }
}
