using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>A deployable unit: melee/ranged, ground/air, swarm or single, with optional passive abilities.</summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Troop", fileName = "NewTroop")]
    public class TroopDefinition : CardDefinition
    {
        [Header("Troop")]
        public UnitDomain Domain = UnitDomain.Ground;
        public TargetMask CanTarget = TargetMask.GroundAndAir;
        public CardStatBlock BaseStats;

        [Header("Abilities")]
        [Tooltip("Passive/triggered abilities always active on this troop (e.g. death shockwave).")]
        public AbilityDefinition[] PassiveAbilities;

        public override CardType Type => CardType.Troop;

        public CardStatBlock GetStatsAtLevel(int level, CardLevelCurve curve)
        {
            var stats = BaseStats;
            stats.Health = Mathf.RoundToInt(ScaleStat(BaseStats.Health, level, curve));
            stats.Damage = Mathf.RoundToInt(ScaleStat(BaseStats.Damage, level, curve));
            return stats;
        }
    }
}
