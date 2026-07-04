using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>A stationary structure: defensive (attacks), resource-generating, or spawner.</summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Building", fileName = "NewBuilding")]
    public class BuildingDefinition : CardDefinition
    {
        [Header("Building")]
        public CardStatBlock BaseStats;
        public TargetMask CanTarget = TargetMask.GroundAndAir;
        [Tooltip("Seconds before the building expires and is removed from the field. 0 = permanent for the match.")]
        public float LifespanSeconds = 0f;

        [Header("Spawner (optional)")]
        [Tooltip("If set, this building periodically spawns the given troop instead of/alongside attacking.")]
        public string SpawnsTroopCardId;
        public float SpawnIntervalSeconds;

        [Header("Resource Generator (optional)")]
        [Tooltip("If > 0, generates this much bonus Elixir for its owner over its lifetime, drip-fed.")]
        public float BonusElixirGenerated;

        public override CardType Type => CardType.Building;

        public CardId SpawnsTroop => new CardId(SpawnsTroopCardId);

        public CardStatBlock GetStatsAtLevel(int level, CardLevelCurve curve)
        {
            var stats = BaseStats;
            stats.Health = Mathf.RoundToInt(ScaleStat(BaseStats.Health, level, curve));
            stats.Damage = Mathf.RoundToInt(ScaleStat(BaseStats.Damage, level, curve));
            return stats;
        }
    }
}
