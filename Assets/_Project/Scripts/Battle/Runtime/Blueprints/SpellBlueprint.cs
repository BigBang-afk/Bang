using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public sealed class SpellBlueprint
    {
        public CardId Id;
        public int ElixirCost;
        public Fix64 Radius;
        public Fix64 Damage;
        public TargetMask AffectsTargets;
        public bool AffectsOwnUnits;
        public StatusEffectType Effect;
        public Fix64 EffectMagnitude;
        public Fix64 EffectDurationSeconds;
        public Fix64 DelaySeconds;
    }
}
