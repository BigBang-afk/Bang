using RoyaleClash.Battle;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Networking
{
    /// <summary>
    /// Read-only, presentation-relevant view of one battle entity. The same struct shape is
    /// produced whether the source is a live <see cref="BattleEntity"/> (practice mode, or the
    /// State Authority itself) or a replicated <see cref="Fusion.NetworkedBattleEntityView"/>
    /// (a remote client) — so Module 7's rendering code never needs to know which.
    /// </summary>
    public readonly struct BattleEntitySnapshot
    {
        public readonly EntityId Id;
        public readonly EntityKind Kind;
        public readonly PlayerSlot Owner;
        public readonly Vector2Fix Position;
        public readonly Fix64 Health;
        public readonly Fix64 MaxHealth;

        public BattleEntitySnapshot(EntityId id, EntityKind kind, PlayerSlot owner, Vector2Fix position, Fix64 health, Fix64 maxHealth)
        {
            Id = id;
            Kind = kind;
            Owner = owner;
            Position = position;
            Health = health;
            MaxHealth = maxHealth;
        }

        public static BattleEntitySnapshot FromEntity(BattleEntity entity) =>
            new BattleEntitySnapshot(entity.Id, entity.Kind, entity.Owner, entity.Position, entity.Health, entity.MaxHealth);
    }
}
