using RoyaleClash.Cards;
using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    public struct StatusEffectInstance
    {
        public StatusEffectType Type;
        public Fix64 Magnitude;
        public Fix64 RemainingSeconds;

        /// <summary>Owner of the entity that applied this effect, so damage-over-time can be attributed for tiebreak stats.</summary>
        public PlayerSlot Applier;
    }
}
