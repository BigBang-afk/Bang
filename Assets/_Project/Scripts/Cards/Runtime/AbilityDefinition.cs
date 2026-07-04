using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// Data describing one special ability (troop passive/ultimate, champion active, spell
    /// on-hit effect). Pure data — the Battle simulation's ability executor reads
    /// <see cref="Code"/> and applies the corresponding effect using the parameters below.
    /// </summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Ability Definition", fileName = "NewAbility")]
    public sealed class AbilityDefinition : ScriptableObject
    {
        [Header("Identity")]
        public string AbilityId;
        public string DisplayName;
        [TextArea] public string Description;
        public Sprite Icon;

        [Header("Behavior")]
        public AbilityCode Code = AbilityCode.None;
        public StatusEffectType AppliesEffect = StatusEffectType.None;

        [Header("Tuning")]
        public float Magnitude;
        public float DurationSeconds;
        public float RadiusTiles;
        public float CooldownSeconds;
        public int ElixirCostToActivate;
    }
}
