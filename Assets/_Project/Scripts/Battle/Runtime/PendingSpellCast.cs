using RoyaleClash.Core;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>A cast spell whose effect resolves after a delay (e.g. a delayed area summon).</summary>
    internal sealed class PendingSpellCast
    {
        public PlayerSlot Caster;
        public SpellBlueprint Blueprint;
        public Vector2Fix Position;
        public Fix64 RemainingDelay;
    }
}
