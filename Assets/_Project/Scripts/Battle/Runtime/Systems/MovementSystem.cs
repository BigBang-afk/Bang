using System.Collections.Generic;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// Lane-pushing movement: a troop walks to its lane's bridge crossing, then to the
    /// enemy King tower, unless it currently has an attack target in range (attack targeting
    /// is decided separately by <see cref="TargetingSystem"/>/<see cref="CombatSystem"/> —
    /// this system only decides where to walk when there's nothing to hit yet).
    /// </summary>
    public static class MovementSystem
    {
        public static void Tick(IReadOnlyList<TroopEntity> troops, ArenaLayout arena, Fix64 dt, System.Func<PlayerSlot, Vector2Fix> enemyKingTowerPosition)
        {
            foreach (TroopEntity troop in troops)
            {
                if (!troop.IsAlive) continue;
                if (troop.IsStunnedOrFrozen) continue;
                if (troop.CurrentTargetId.IsValid) continue; // engaged in combat; CombatSystem handles it, no movement.

                if (!troop.HasCrossedRiver && !arena.IsOnOwnSide(troop.Owner, troop.Position))
                    troop.HasCrossedRiver = true;

                Vector2Fix destination = troop.HasCrossedRiver
                    ? enemyKingTowerPosition(troop.Owner)
                    : arena.GetBridgeCrossingPosition(troop.Lane);

                Fix64 speed = troop.Blueprint.MoveSpeed * troop.MovementSpeedMultiplier();
                Fix64 maxDelta = speed * dt;
                if (maxDelta <= Fix64.Zero) continue;

                troop.Position = Vector2Fix.MoveTowards(troop.Position, destination, maxDelta);
            }
        }
    }
}
