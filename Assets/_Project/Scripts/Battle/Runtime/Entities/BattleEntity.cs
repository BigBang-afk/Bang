using System.Collections.Generic;
using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Base runtime state shared by troops, buildings, and towers.</summary>
    public abstract class BattleEntity
    {
        public EntityId Id;
        public abstract EntityKind Kind { get; }
        public PlayerSlot Owner;
        public Vector2Fix Position;
        public Fix64 Health;
        public Fix64 MaxHealth;
        public Fix64 AttackCooldownRemaining;
        public EntityId CurrentTargetId = EntityId.Invalid;

        public Fix64 ShieldHealth;
        public Fix64 ShieldRemainingSeconds;

        public readonly List<StatusEffectInstance> StatusEffects = new List<StatusEffectInstance>();

        public bool IsAlive => Health > Fix64.Zero;

        public void ApplyStatusEffect(PlayerSlot applier, StatusEffectType type, Fix64 magnitude, Fix64 duration)
        {
            for (int i = 0; i < StatusEffects.Count; i++)
            {
                if (StatusEffects[i].Type != type) continue;
                var existing = StatusEffects[i];
                existing.Magnitude = Fix64.Max(existing.Magnitude, magnitude);
                existing.RemainingSeconds = Fix64.Max(existing.RemainingSeconds, duration);
                existing.Applier = applier;
                StatusEffects[i] = existing;
                return;
            }
            StatusEffects.Add(new StatusEffectInstance { Type = type, Magnitude = magnitude, RemainingSeconds = duration, Applier = applier });
        }

        public bool HasEffect(StatusEffectType type) => TryGetEffect(type, out _);

        public bool TryGetEffect(StatusEffectType type, out StatusEffectInstance effect)
        {
            foreach (var e in StatusEffects)
            {
                if (e.Type == type)
                {
                    effect = e;
                    return true;
                }
            }
            effect = default;
            return false;
        }

        public bool IsStunnedOrFrozen => HasEffect(StatusEffectType.Stun) || HasEffect(StatusEffectType.Freeze);

        /// <summary>Combined movement speed multiplier from Slow/Freeze/Rage/Haste. Frozen halts movement entirely.</summary>
        public Fix64 MovementSpeedMultiplier()
        {
            if (HasEffect(StatusEffectType.Freeze)) return Fix64.Zero;

            Fix64 multiplier = Fix64.OneValue;
            if (TryGetEffect(StatusEffectType.Slow, out var slow))
                multiplier *= Fix64.Clamp(Fix64.OneValue - slow.Magnitude, Fix64.Zero, Fix64.OneValue);
            if (TryGetEffect(StatusEffectType.Rage, out var rage))
                multiplier *= (Fix64.OneValue + rage.Magnitude);
            if (TryGetEffect(StatusEffectType.Haste, out var haste))
                multiplier *= (Fix64.OneValue + haste.Magnitude);
            return multiplier;
        }

        /// <summary>Ticks status-effect durations down and returns any per-second damage-over-time to apply, with its applier.</summary>
        public Fix64 TickStatusEffects(Fix64 dt, out PlayerSlot dotApplier)
        {
            dotApplier = default;
            Fix64 dotDamage = Fix64.Zero;
            for (int i = StatusEffects.Count - 1; i >= 0; i--)
            {
                var effect = StatusEffects[i];
                if (effect.Type == StatusEffectType.DamageOverTime)
                {
                    dotDamage += effect.Magnitude * dt;
                    dotApplier = effect.Applier;
                }

                effect.RemainingSeconds -= dt;
                if (effect.RemainingSeconds <= Fix64.Zero)
                    StatusEffects.RemoveAt(i);
                else
                    StatusEffects[i] = effect;
            }

            if (ShieldRemainingSeconds > Fix64.Zero)
            {
                ShieldRemainingSeconds -= dt;
                if (ShieldRemainingSeconds <= Fix64.Zero)
                    ShieldHealth = Fix64.Zero;
            }

            return dotDamage;
        }

        /// <summary>Applies damage to shield first, then health. Returns true if this killed the entity.</summary>
        public bool TakeDamage(Fix64 amount)
        {
            if (amount <= Fix64.Zero) return false;

            if (ShieldHealth > Fix64.Zero)
            {
                Fix64 absorbed = Fix64.Min(ShieldHealth, amount);
                ShieldHealth -= absorbed;
                amount -= absorbed;
                if (amount <= Fix64.Zero) return false;
            }

            Health -= amount;
            if (Health < Fix64.Zero) Health = Fix64.Zero;
            return Health == Fix64.Zero;
        }
    }
}
