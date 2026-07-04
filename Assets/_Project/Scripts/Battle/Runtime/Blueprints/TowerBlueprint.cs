using RoyaleClash.Cards;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Stats for a King or Princess tower. Towers aren't cards, so these are fixed defaults rather than deck-driven.</summary>
    public sealed class TowerBlueprint
    {
        public TowerTier Tier;
        public Fix64 MaxHealth;
        public Fix64 Damage;
        public Fix64 HitSpeedSeconds;
        public Fix64 Range;
        public TargetMask CanTarget = TargetMask.GroundAndAir;
    }

    /// <summary>Original, non-card tower balance numbers shared by every arena until Module 8 allows per-arena overrides.</summary>
    public static class DefaultTowerBlueprints
    {
        public static TowerBlueprint Princess => new TowerBlueprint
        {
            Tier = TowerTier.Princess,
            MaxHealth = Fix64.FromInt(1400),
            Damage = Fix64.FromInt(90),
            HitSpeedSeconds = Fix64.FromFloat(0.8f),
            Range = Fix64.FromFloat(7.5f),
        };

        public static TowerBlueprint King => new TowerBlueprint
        {
            Tier = TowerTier.King,
            MaxHealth = Fix64.FromInt(4000),
            Damage = Fix64.FromInt(110),
            HitSpeedSeconds = Fix64.FromFloat(1f),
            Range = Fix64.FromInt(7),
        };
    }
}
