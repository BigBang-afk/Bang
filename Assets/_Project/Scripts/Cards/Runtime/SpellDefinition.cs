using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>An instant or duration area effect: direct damage, status effect, or both.</summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Spell", fileName = "NewSpell")]
    public class SpellDefinition : CardDefinition
    {
        [Header("Spell")]
        public float RadiusTiles = 2.5f;
        public int BaseDamage;
        public TargetMask AffectsTargets = TargetMask.GroundAndAir;
        public bool AffectsOwnUnits = false;

        [Header("Status Effect (optional)")]
        public StatusEffectType Effect = StatusEffectType.None;
        public float EffectMagnitude;
        public float EffectDurationSeconds;

        [Header("Deferred Effect (optional)")]
        [Tooltip("Seconds between cast and effect resolving, e.g. a delayed summon spell.")]
        public float DelaySeconds = 0f;

        public override CardType Type => CardType.Spell;

        public int GetDamageAtLevel(int level, CardLevelCurve curve)
            => Mathf.RoundToInt(ScaleStat(BaseDamage, level, curve));
    }
}
