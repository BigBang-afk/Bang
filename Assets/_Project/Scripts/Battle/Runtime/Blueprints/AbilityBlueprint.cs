using RoyaleClash.Cards;
using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>
    /// Plain-data, Fix64-based counterpart to <see cref="AbilityDefinition"/>. The Battle
    /// simulation only ever touches these (never the ScriptableObject), so the hot loop has
    /// no Unity object references and can run identically in EditMode tests, a local practice
    /// match, or a Photon Fusion host tick.
    /// </summary>
    public sealed class AbilityBlueprint
    {
        public string AbilityId;
        public AbilityCode Code;
        public StatusEffectType Effect;
        public Fix64 Magnitude;
        public Fix64 Duration;
        public Fix64 Radius;
        public Fix64 Cooldown;
        public int ElixirCost;
    }
}
