using System.Collections.Generic;
using RoyaleClash.Cards;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Pure target-acquisition logic: nearest valid enemy within sight/range, respecting a <see cref="TargetMask"/>.</summary>
    public static class TargetingSystem
    {
        public static bool TryFindNearestTarget(BattleEntity attacker, TargetMask canTarget, Fix64 withinRange, IReadOnlyList<BattleEntity> entities, out BattleEntity target, BattleEntity exclude = null)
        {
            target = null;
            Fix64 bestDistSq = Fix64.MaxValue;
            Fix64 rangeSq = withinRange * withinRange;

            foreach (BattleEntity candidate in entities)
            {
                if (candidate == exclude || !candidate.IsAlive || candidate.Owner.Equals(attacker.Owner))
                    continue;
                if (!MatchesTargetMask(candidate, canTarget))
                    continue;

                Fix64 distSq = Vector2Fix.DistanceSquared(attacker.Position, candidate.Position);
                if (distSq > rangeSq)
                    continue;

                if (distSq < bestDistSq)
                {
                    bestDistSq = distSq;
                    target = candidate;
                }
            }

            return target != null;
        }

        public static bool IsTargetable(BattleEntity candidate, TargetMask mask) => MatchesTargetMask(candidate, mask);

        private static bool MatchesTargetMask(BattleEntity candidate, TargetMask mask)
        {
            bool isBuilding = candidate.Kind == EntityKind.Building || candidate.Kind == EntityKind.Tower;

            if (mask == TargetMask.BuildingsOnly)
                return isBuilding;

            bool isAir = candidate is TroopEntity troop && troop.Blueprint.Domain == UnitDomain.Air;
            return isAir ? (mask & TargetMask.Air) != 0 : (mask & TargetMask.Ground) != 0;
        }
    }
}
