using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed class BuildingBlueprint
    {
        public CardId Id;
        public int ElixirCost;
        public TargetMask CanTarget;
        public Fix64 MaxHealth;
        public Fix64 Damage;
        public Fix64 HitSpeedSeconds;
        public Fix64 Range;

        /// <summary>0 = stands for the rest of the match.</summary>
        public Fix64 LifespanSeconds;

        public CardId? SpawnsTroop;
        public Fix64 SpawnIntervalSeconds;

        public Fix64 BonusElixirGenerated;

        public bool IsDefensive => Damage > Fix64.Zero;
        public bool IsSpawner => SpawnsTroop.HasValue && SpawnIntervalSeconds > Fix64.Zero;
        public bool IsElixirGenerator => BonusElixirGenerated > Fix64.Zero;
    }
}
